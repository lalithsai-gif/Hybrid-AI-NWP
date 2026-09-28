from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_DIR = Path(os.environ.get("AURA_ARTIFACT_DIR", str(ROOT / "ml_artifacts")))
CKPT_PATH = ARTIFACT_DIR / "aura_blend_sdw_net.pt"
NPZ_PATH = ARTIFACT_DIR / "locked_test_outputs.npz"
METRICS_PATH = ARTIFACT_DIR / "final_metrics.csv"
ABLATION_PATH = ARTIFACT_DIR / "ablation_results.csv"
RUN_METADATA_PATH = ARTIFACT_DIR / "run_metadata.json"