import socket
import json
import time
import os
from datetime import datetime
from dotenv import load_dotenv
import csv
import re

load_dotenv()

HOST = os.getenv("HOST")
PORT = int(os.getenv("PORT"))
DELAY = int(os.getenv("CLIENT_DELAY"))

def clean_time(value):
    if not value:
        return None

    # match HH:MM:SS
    match = re.search(r"\b\d{2}:\d{2}:\d{2}\b", value)

    if match:
        return match.group(0)

    return None

def fix_merged_columns(parts):
    fixed = []

    for item in parts:
        # detect pattern: number + space + text
        match = re.match(r"^(\d+\.\d+)\s+([A-Za-z]+)$", item)

        if match:
            fixed.append(match.group(1))  # number
            fixed.append(match.group(2))  # name
        else:
            fixed.append(item)

    return fixed

def clean_file_generator(file_path):
    buffer = ""

    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            buffer += " " + line

            # normalize spaces
            temp_line = re.sub(r"\s+", " ", buffer.strip())

            parts = [p.strip() for p in temp_line.split(",")]
            parts = fix_merged_columns(parts)

            #  wait until we have enough columns
            if len(parts) < 12:
                continue

            #  take first 12 columns
            parts = parts[:12]
            buffer = ""   # reset for next row

            #  fix date
            try:
                d, m, y = parts[0].split("/")
                if len(y) == 2:
                    y = "20" + y
                parts[0] = f"{y}-{m}-{d}"
                parts[1] = clean_time(parts[1])
            except:
                continue

            #  numeric defaults
            numeric_indexes = [5, 6, 7, 9]
            for i in numeric_indexes:
                if parts[i] == "":
                    parts[i] = "0000.0"

            yield ",".join(parts)


def send_file_in_batches(file_path, batch_size=10):
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((HOST, PORT))

    print("Client connected")

    batch = []

    for row in clean_file_generator(file_path):
        batch.append(row)

        if len(batch) == batch_size:
            send_batch(client, batch)
            batch = []

    # send remaining rows
    if batch:
        send_batch(client, batch)

    client.shutdown(socket.SHUT_WR)

    response = client.recv(1024).decode()
    print("Server response:", response)

    client.close()

def send_batch(client, batch):
    data = "\n".join(batch) + "\n---END_BATCH---\n"
    client.sendall(data.encode())

    print(f"Sent batch of {len(batch)} rows")



if __name__ == "__main__":
    file_path = "D:/games/Report232/Report232/2025_07_08_C.txt"   
    send_file_in_batches(file_path)