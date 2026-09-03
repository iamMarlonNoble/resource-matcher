import io
import json
import os
import re
from typing import Optional

import pandas as pd
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GROQ_MODEL = "openai/gpt-oss-120b"

app = FastAPI(title="Resource Matcher API")


@app.on_event("startup")
def startup():
    _load_persisted()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
ROSTER_PATH = os.path.join(DATA_DIR, "roster.csv")
DEMANDS_PATH = os.path.join(DATA_DIR, "demands.csv")
KEY_PATH = os.path.join(DATA_DIR, ".apikey")

store: dict = {"roster": None, "demands": None, "groq_api_key": os.getenv("GROQ_API_KEY", "")}


def _load_persisted():
    """Reload previously uploaded files and saved API key on server startup."""
    if os.path.exists(ROSTER_PATH):
        try:
            df = read_csv_any_encoding(open(ROSTER_PATH, "rb").read())
            store["roster"] = deduplicate_roster(df)
        except Exception:
            pass
    if os.path.exists(DEMANDS_PATH):
        try:
            df = read_csv_any_encoding(open(DEMANDS_PATH, "rb").read())
            store["demands"] = filter_demands(df)
        except Exception:
            pass
    if not store["groq_api_key"] and os.path.exists(KEY_PATH):
        try:
            store["groq_api_key"] = open(KEY_PATH).read().strip()
        except Exception:
            pass


def get_client() -> Groq:
    api_key = store["groq_api_key"] or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Groq API key not set. Enter it in the app settings.",
        )
    return Groq(api_key=api_key)


def read_csv_any_encoding(content: bytes) -> pd.DataFrame:
    for enc in ("utf-8", "latin-1", "cp1252", "utf-8-sig"):
        try:
            return pd.read_csv(io.BytesIO(content), low_memory=False, encoding=enc)
        except (UnicodeDecodeError, Exception):
            continue
    raise ValueError("Could not decode file with any supported encoding")


def safe_str(val) -> str:
    s = str(val)
    return "" if s in ("nan", "NaT", "None", "<NA>") else s


def deduplicate_roster(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["Name of Employment Status"].fillna("") == "Active"].copy()

    result = []
    for personnel_no, group in df.groupby("Personnel No"):
        # Sort by FTE (primary allocation first)
        try:
            group_sorted = group.assign(
                _fte=pd.to_numeric(group.get("Sum of FTE", 1), errors="coerce").fillna(0)
            ).sort_values("_fte", ascending=False)
        except Exception:
            group_sorted = group

        primary = group_sorted.iloc[0]

        # Detect bench/available allocations
        act_cat = group["Activity Category"].fillna("")
        bench_mask = act_cat.str.contains("Ready for Deployment|Bench", case=False, regex=True)
        has_bench = bench_mask.any()
        try:
            bench_fte = pd.to_numeric(
                group.loc[bench_mask, "Sum of FTE"], errors="coerce"
            ).fillna(0).sum()
        except Exception:
            bench_fte = 0.0

        # Latest roll-off date
        try:
            roll_dates = pd.to_datetime(group["Roll Off Date"], errors="coerce").dropna()
            latest_roll_off = roll_dates.max().strftime("%m/%d/%Y") if not roll_dates.empty else ""
        except Exception:
            latest_roll_off = ""

        # Earliest schedulable date
        try:
            sched_dates = pd.to_datetime(group["Schedulable as of"], errors="coerce").dropna()
            schedulable = sched_dates.min().strftime("%m/%d/%Y") if not sched_dates.empty else ""
        except Exception:
            schedulable = ""

        # Current non-bench projects
        non_bench = group[~bench_mask]
        projects = list(
            {
                safe_str(r["Project"])
                for _, r in non_bench.iterrows()
                if safe_str(r.get("Project", "")) and "Bench" not in safe_str(r.get("Project", ""))
            }
        )
        current_projects = "; ".join(projects)

        # Availability label
        if has_bench and bench_fte >= 1.0:
            availability = "Available (Bench)"
        elif has_bench and bench_fte > 0:
            availability = f"Partially Available ({int(bench_fte * 100)}% bench)"
        else:
            availability = safe_str(primary.get("Activity Category", "Deployed"))

        bench_ageing = ""
        if "Bench Ageing (Months)" in group.columns:
            try:
                vals = pd.to_numeric(group["Bench Ageing (Months)"], errors="coerce").dropna()
                bench_ageing = str(round(vals.max(), 1)) if not vals.empty else ""
            except Exception:
                pass

        result.append(
            {
                "Personnel No": str(personnel_no),
                "Name": safe_str(primary.get("Name", "")),
                "Level": safe_str(primary.get("Level", "")),
                "Primary Skill": safe_str(primary.get("Primary Skill", "")),
                "Secondary Skills": safe_str(primary.get("Skill (Secondary)", "")),
                "Primary Proficiency": safe_str(primary.get("Proficiency (Latest Cycle)", "")),
                "Secondary Proficiency": safe_str(
                    primary.get("Proficiency Latest Cycle (Secondary Skill)", "")
                ),
                "Roll Off Date": latest_roll_off,
                "Availability": availability,
                "Bench %": f"{int(bench_fte * 100)}%" if has_bench else "0%",
                "Resource Location": safe_str(primary.get("Resource Location", "")),
                "Home Loc": safe_str(primary.get("Home Loc", "")),
                "Schedulable As Of": schedulable,
                "Email": safe_str(primary.get("Email Address", "")),
                "Current Projects": current_projects,
                "Job Family Group": safe_str(primary.get("Job Family Group", "")),
                "Job Family": safe_str(primary.get("Job Family", "")),
                "Bench Ageing (Months)": bench_ageing,
            }
        )

    return pd.DataFrame(result)


def filter_demands(df: pd.DataFrame) -> pd.DataFrame:
    if "Demand Status" in df.columns:
        return df[
            df["Demand Status"].fillna("").str.contains("Active|Open", case=False, regex=True)
        ].copy()
    return df.copy()


@app.get("/api/config/status")
def config_status():
    key = store["groq_api_key"] or os.getenv("GROQ_API_KEY", "")
    return {"configured": bool(key), "key_preview": f"{key[:8]}..." if key else ""}


@app.post("/api/config/key")
def set_api_key(body: dict):
    key = str(body.get("key", "")).strip()
    if not key:
        raise HTTPException(status_code=400, detail="Key cannot be empty")
    store["groq_api_key"] = key
    try:
        with open(KEY_PATH, "w") as f:
            f.write(key)
    except Exception:
        pass
    return {"ok": True, "key_preview": f"{key[:8]}..."}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "roster_loaded": store["roster"] is not None,
        "demands_loaded": store["demands"] is not None,
        "roster_count": len(store["roster"]) if store["roster"] is not None else 0,
        "demands_count": len(store["demands"]) if store["demands"] is not None else 0,
    }


@app.post("/api/upload/roster")
async def upload_roster(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = read_csv_any_encoding(content)
        store["roster"] = deduplicate_roster(df)
        with open(ROSTER_PATH, "wb") as f:
            f.write(content)
        return {
            "message": "Roster uploaded successfully",
            "raw_rows": len(df),
            "unique_resources": len(store["roster"]),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse roster: {e}")


@app.post("/api/upload/demands")
async def upload_demands(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = read_csv_any_encoding(content)
        store["demands"] = filter_demands(df)
        with open(DEMANDS_PATH, "wb") as f:
            f.write(content)
        return {
            "message": "Demands uploaded successfully",
            "total_rows": len(df),
            "active_demands": len(store["demands"]),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse demands: {e}")


@app.get("/api/demands")
def get_demands(
    search: Optional[str] = None,
    skill: Optional[str] = None,
    level: Optional[str] = None,
):
    if store["demands"] is None:
        raise HTTPException(status_code=400, detail="Demands not uploaded yet")

    df = store["demands"].copy()

    if search:
        mask = (
            df.get("Project", pd.Series(dtype=str)).fillna("").str.contains(search, case=False)
            | df.get("Client", pd.Series(dtype=str)).fillna("").str.contains(search, case=False)
            | df.get("RRD Number", pd.Series(dtype=str)).fillna("").str.contains(search, case=False)
            | df.get("Engagement Name", pd.Series(dtype=str)).fillna("").str.contains(search, case=False)
        )
        df = df[mask]

    if skill:
        df = df[df.get("Primary Skill", pd.Series(dtype=str)).fillna("").str.contains(skill, case=False)]

    if level:
        df = df[
            df.get("Management Level", pd.Series(dtype=str)).fillna("").astype(str).str.contains(
                level, case=False
            )
        ]

    cols = [
        "RRD Number", "Project", "Engagement Name", "Client",
        "Management Level", "Primary Skill", "Additional Skills",
        "Demand Status", "Requested Start Date", "Expected Fulfillment Date",
        "Source Location", "Management Level Flex", "Location Flex",
        "Project Role", "Job Family Group", "Domain", "Project Industry Sector",
        "Due/Overdue", "Ageing in Weeks", "Demand Segmentation",
    ]
    available = [c for c in cols if c in df.columns]
    records = df[available].fillna("").to_dict(orient="records")
    return {"demands": records, "total": len(records)}


@app.get("/api/debug/columns")
def debug_columns():
    """Show actual column names in the loaded data — useful for troubleshooting."""
    return {
        "demand_columns": list(store["demands"].columns) if store["demands"] is not None else [],
        "roster_columns": list(store["roster"].columns) if store["roster"] is not None else [],
    }


@app.get("/api/demands/filters")
def get_demand_filters():
    if store["demands"] is None:
        return {"skills": [], "levels": []}
    df = store["demands"]
    skills = sorted(s for s in df.get("Primary Skill", pd.Series()).fillna("").unique() if s)
    levels = sorted(
        l
        for l in df.get("Management Level", pd.Series()).fillna("").astype(str).unique()
        if l and l != "nan"
    )
    return {"skills": skills, "levels": levels}


@app.get("/api/demands/{rrd_number}")
def get_demand(rrd_number: str):
    if store["demands"] is None:
        raise HTTPException(status_code=400, detail="Demands not uploaded yet")
    row = store["demands"][store["demands"]["RRD Number"] == rrd_number]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Demand {rrd_number} not found")
    return {k: safe_str(v) for k, v in row.iloc[0].to_dict().items()}


@app.post("/api/match/{rrd_number}")
def match_resources(rrd_number: str, body: dict = Body(default={})):
    if store["demands"] is None or store["roster"] is None:
        raise HTTPException(status_code=400, detail="Both files must be uploaded first")

    ai_client = get_client()

    demand_row = store["demands"][store["demands"]["RRD Number"] == rrd_number]
    if demand_row.empty:
        raise HTTPException(status_code=404, detail=f"Demand {rrd_number} not found")

    demand = demand_row.iloc[0]
    roster = store["roster"].copy()

    required_skill = safe_str(demand.get("Primary Skill", ""))
    additional_skills = safe_str(demand.get("Additional Skills", ""))
    required_level = safe_str(demand.get("Management Level", ""))
    level_flex = safe_str(demand.get("Management Level Flex", "N")).upper() == "Y"

    # Read filter config from request body (with defaults)
    level_window = int(body.get("level_window", 2))
    availability_filter = body.get("availability_filter", "all")   # "all" | "bench_only"
    location_filter = body.get("location_filter", "all")           # "all" | "demand"
    skill_strictness = body.get("skill_strictness", "any")         # "any" | "primary_only"

    # Filter by level (±N from required; 1=highest, 13=lowest)
    try:
        req_lvl_int = int(required_level)
        lvl_min = req_lvl_int - level_window
        lvl_max = req_lvl_int + level_window
        roster["_level_int"] = pd.to_numeric(roster["Level"], errors="coerce")
        roster = roster[roster["_level_int"].between(lvl_min, lvl_max)].copy()
    except (ValueError, TypeError):
        pass

    # Filter by availability
    if availability_filter == "bench_only":
        roster = roster[
            roster["Availability"].str.contains("Available|Bench|Partially", case=False, na=False)
        ].copy()

    # Filter by location (match demand's Source Location against Home Loc / Resource Location)
    if location_filter == "demand":
        demand_location = safe_str(demand.get("Source Location", "")).strip()
        if demand_location:
            roster = roster[
                roster["Home Loc"].str.contains(demand_location, case=False, na=False)
                | roster["Resource Location"].str.contains(demand_location, case=False, na=False)
            ].copy()

    # Pre-filter by skill
    MAX_CANDIDATES = 12  # keep total prompt under 7000 tokens (free-tier limit)

    if skill_strictness == "primary_only":
        # Hard filter: primary skill must contain the required skill keyword
        primary_keywords = [k.strip().lower() for k in required_skill.replace(",", " ").split() if len(k.strip()) > 3]
        if primary_keywords:
            def primary_match(row):
                text = row.get("Primary Skill", "").lower()
                return any(kw in text for kw in primary_keywords)
            roster = roster[roster.apply(primary_match, axis=1)].copy()
        candidates = roster.head(MAX_CANDIDATES)
    else:
        # Soft filter: score by keyword presence across primary + secondary skills
        all_keywords = [
            k.strip().lower()
            for k in (required_skill + " " + additional_skills).replace(",", " ").split()
            if len(k.strip()) > 3
        ]
        if all_keywords:
            def skill_score(row):
                text = f"{row.get('Primary Skill', '')} {row.get('Secondary Skills', '')}".lower()
                return sum(1 for kw in all_keywords if kw in text)

            roster["_score"] = roster.apply(skill_score, axis=1)
            matched = roster[roster["_score"] > 0].sort_values("_score", ascending=False)
            unmatched = roster[roster["_score"] == 0]
            candidates = pd.concat([matched.head(MAX_CANDIDATES), unmatched.head(2)]).drop_duplicates(
                subset="Personnel No"
            ).head(MAX_CANDIDATES)
        else:
            candidates = roster.head(MAX_CANDIDATES)

    def top_skills(s: str, n: int = 3) -> str:
        parts = [x.strip() for x in s.split(",") if x.strip()]
        return ", ".join(parts[:n])

    # Compact representation — short keys to save tokens
    candidate_list = [
        {
            "id": safe_str(row.get("Personnel No", "")),
            "n": safe_str(row.get("Name", "")),
            "lv": safe_str(row.get("Level", "")),
            "sk": safe_str(row.get("Primary Skill", "")),
            "pf": safe_str(row.get("Primary Proficiency", "")),
            "ss": top_skills(safe_str(row.get("Secondary Skills", ""))),
            "av": safe_str(row.get("Availability", "")),
            "sd": safe_str(row.get("Schedulable As Of", "")),
            "lo": safe_str(row.get("Home Loc", "")),
        }
        for _, row in candidates.iterrows()
    ]

    jd_raw = safe_str(demand.get("Brief Job Description", ""))
    jd_summary = jd_raw[:150] if jd_raw else ""

    prompt = f"""Score each roster candidate for this open demand. Use real data from the candidate list.

DEMAND:
Project: {demand.get("Project","")} | Client: {demand.get("Client","")}
Role: {demand.get("Project Role","")} | Level needed: {required_level}{"(±1 ok)" if level_flex else ""}
Primary skill: {required_skill} | Nice-to-have: {additional_skills}
Location: {demand.get("Source Location","")} | Start: {demand.get("Requested Start Date","")}

CANDIDATES:
{json.dumps(candidate_list, separators=(',', ':'))}

Fields: id=personnel_no, n=name, lv=level, sk=primary_skill, pf=proficiency(P1=expert), ss=secondary_skills, av=availability, sd=schedulable_date, lo=location

Rank by: 1)skill match 2)level match 3)bench/available first 4)secondary skills 5)earlier schedulable date

Return a JSON object with this exact shape:
{{
  "matches": [
    {{
      "personnel_no": "<use id field>",
      "name": "<use n field>",
      "fit_score": "<Excellent|Good|Fair>",
      "fit_percentage": <integer>,
      "reasoning": "<2 sentences about skill and availability fit>",
      "strengths": ["<skill or trait>"],
      "gaps": []
    }}
  ],
  "summary": "<2 sentences naming the best candidate and why>"
}}"""

    try:
        msg = ai_client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=2500,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are a resource management assistant. Respond with valid JSON only. When referring to candidates, use neutral language — use their name or 'this candidate' instead of he/she/him/her.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        raw = (msg.choices[0].message.content or "").strip()
        # Strip any residual think tags or code fences
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            raw = m.group(0)
        if not raw:
            raise HTTPException(status_code=500, detail="AI returned an empty response — check your Groq API key and try again")
        ai_result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON ({repr(raw[:120])}): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI matching failed: {e}")

    personnel_map = {
        safe_str(row["Personnel No"]): {k: safe_str(v) for k, v in row.to_dict().items()}
        for _, row in candidates.iterrows()
    }

    enriched = []
    for match in ai_result.get("matches", []):
        candidate_data = personnel_map.get(str(match.get("personnel_no", "")), {})
        enriched.append({**candidate_data, **match})

    demand_dict = {k: safe_str(v) for k, v in demand.to_dict().items()}

    return {
        "demand": demand_dict,
        "matches": enriched,
        "summary": str(ai_result.get("summary", "")),
        "total_candidates_evaluated": len(candidates),
    }
