def validate_file_size(size: int, max_size: int) -> bool:
    return size <= max_size

def validate_dataset_schema(columns: list, required: list) -> bool:
    return all(col in columns for col in required)
