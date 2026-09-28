export interface GridPayload {
  latitudes: number[];
  longitudes: number[];
  values: (number | null)[][];
  min: number;
  max: number;
  mean: number;
  units: string;
  bounds: [[number, number], [number, number]];
}

export interface EvpStatus {
  evp_alpha: number;
  extreme_threshold_normalized: number;
  mean_abs_delta_normalized: number;
  max_abs_delta_normalized: number;
  evp_or_guardrail_changed_field: boolean;
  guardrail_clip_detected: boolean;
  guardrail_bounds_kelvin: [number, number];
  guardrail_bounds_celsius: [number, number];
  note: string;
}

export interface ForecastResponse {
  mode: string;
  date: string;
  init: string;
  lead_hours: number;
  variable: string;
  variable_label: string;
  units: string;
  model: string;
  model_key: string;
  index: number;
  grid: GridPayload;
  evp: EvpStatus;
  input_health?: {
    status: string;
    mask: Record<string, number>;
    method: string;
    weights?: Record<string, GridPayload>;
  };
}

export interface WeightsResponse {
  date: string;
  init: string;
  lead_hours: number;
  weights: Record<string, GridPayload>;
  mean_weights: Record<string, number>;
  note: string;
}

export interface ComparisonResponse {
  date: string;
  init: string;
  lead_hours: number;
  sample_metrics: Record<string, {
    RMSE_C: number;
    MAE_C: number;
    Bias_C: number;
    ACC: number;
  }>;
  locked_test_metrics: Array<{
    Model: string;
    RMSE_C: string;
    MAE_C: string;
    Bias_C: string;
    ACC: string;
    FSS: string;
    CSI: string;
    ETS: string;
    POD: string;
    FAR: string;
  }>;
  maps: Record<string, GridPayload>;
  weights: Record<string, GridPayload>;
  mean_weights: Record<string, number>;
  evp: EvpStatus;
}

export interface CaseItem {
  id: string;
  title: string;
  index: number;
  date: string;
  init: string;
  lead_hours: number;
  reason: string;
}

export interface CaseDetail extends CaseItem {
  metrics: Record<string, {
    RMSE_C: number;
    MAE_C: number;
    Bias_C: number;
    ACC: number;
  }>;
  evp: EvpStatus;
  maps: Record<string, any>;
  steps: Array<{
    id: string;
    title: string;
    model?: string;
    units?: string;
    description: string;
  }>;
  narrative: string;
}

export interface ModelInfo {
  system: string;
  full_name: string;
  mode: string;
  live_weather: boolean;
  models: string[];
  target: string;
  resolution: string;
  india_domain: number[];
  grid: {
    height: number;
    width: number;
    latitudes: number[];
    longitudes: number[];
    note: string;
  };
  lead_hours: number[];
  locked_test_samples: number;
  train_mean_K: number;
  train_std_K: number;
  evp_alpha: number;
  extreme_threshold_normalized: number;
  max_residual_norm: number;
  guardrail_K: { lower: number; upper: number };
  architecture: {
    n_models: number;
    local_extra_channels: number;
    global_channels: number;
    hidden: number;
    parameters: number;
    local_extra_layout: string;
    static_channels: string[];
    regime_channels: string[];
  };
  measured_test_rmse_change_vs_arithmetic_mean_pct: number;
  limitations: string[];
}
