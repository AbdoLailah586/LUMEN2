"""
Process files larger than RAM using chunking.
"""
import pandas as pd
import os
from typing import Callable, Any

class ChunkedProcessor:
    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size

    def process_file_in_chunks(self, file_path: str, processing_func: Callable[[pd.DataFrame], pd.DataFrame], output_path: str):
        """
        Reads a CSV file in chunks, applies a processing function to each chunk,
        and streams the result to a new file.
        """
        if not os.path.exists(file_path):
             raise FileNotFoundError(f"Dataset file not found: {file_path}")
             
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext != '.csv':
            raise ValueError(f"ChunkedProcessor currently only supports .csv files. Received: {file_ext}")

        first_chunk = True
        try:
            chunk_iterator = pd.read_csv(file_path, chunksize=self.chunk_size)
            
            for chunk in chunk_iterator:
                # Apply the specific processing logic to this chunk
                processed_chunk = processing_func(chunk)
                
                # Append to output, writing header only on the first chunk
                processed_chunk.to_csv(
                    output_path, 
                    mode='w' if first_chunk else 'a', 
                    header=first_chunk, 
                    index=False
                )
                first_chunk = False
                
        except Exception as e:
            raise RuntimeError(f"Error during chunk processing: {str(e)}")
            
        return output_path
