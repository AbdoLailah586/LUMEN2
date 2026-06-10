export interface CleaningPreset {
    id: string;
    label: string;
    description: string;
    config: Record<string, unknown>;
    columnStrategyDefault?: "auto" | "mode";
}

export const CLEANING_PRESETS: CleaningPreset[] = [
    {
        id: "minimal",
        label: "Minimal",
        description: "Fill missing values and remove duplicates only.",
        columnStrategyDefault: "auto",
        config: {
            missing_strategy: "auto",
            outlier_method: "none",
            outlier_action: "clip",
            scaling_method: "none",
            encoding_method: "none",
            drop_duplicates: true,
            apply_log_transform: false,
            strip_whitespace: false,
            lowercase_text: false,
            drop_columns: [],
        },
    },
    {
        id: "ml_ready",
        label: "ML Ready",
        description: "Impute, clip outliers, encode categories, and standard-scale numerics.",
        columnStrategyDefault: "auto",
        config: {
            missing_strategy: "auto",
            outlier_method: "iqr",
            outlier_action: "clip",
            scaling_method: "standard",
            encoding_method: "label",
            drop_duplicates: true,
            apply_log_transform: false,
            strip_whitespace: true,
            lowercase_text: false,
            drop_columns: [],
        },
    },
    {
        id: "thorough",
        label: "Thorough",
        description: "Full cleanup: text normalization, outliers, log transform, and dedup.",
        columnStrategyDefault: "auto",
        config: {
            missing_strategy: "auto",
            outlier_method: "auto",
            outlier_action: "clip",
            scaling_method: "minmax",
            encoding_method: "onehot",
            drop_duplicates: true,
            apply_log_transform: true,
            strip_whitespace: true,
            lowercase_text: true,
            drop_columns: [],
        },
    },
];
