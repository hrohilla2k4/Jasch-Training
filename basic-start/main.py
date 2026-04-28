import socket
import pyodbc
import os
import csv
import io
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("HOST")
PORT = int(os.getenv("PORT"))

# 🔥 DB CONNECTION (single)
def get_connection():
    conn_str = (
        f"DRIVER={{{os.getenv('DB_DRIVER')}}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"PORT={os.getenv('DB_PORT')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USER')};"
        f"PWD={os.getenv('DB_PASSWORD')};"
    )
    return pyodbc.connect(conn_str)

# 🔥 CSV parser
def parse_csv(text):
    reader = csv.reader(io.StringIO(text))
    return list(reader)

# 🔥 Safe getter
def safe_get(row, index, default=None):
    try:
        value = row[index].strip()
        return value if value != "" else default
    except IndexError:
        return default

# 🔥 BULK INSERT (FAST)
def insert_rows(cursor, conn, rows):
    query = """
    INSERT INTO production_data (
        date_col, time_col, direction, load_status, coil_id,
        line_speed, set_point, actual_thickness,
        name, width, alloy
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    data_to_insert = []

    for row in rows:
        if len(row) < 11:
            continue

        data_to_insert.append((
            safe_get(row, 0, None),
            safe_get(row, 1, None),
            safe_get(row, 2, ""),
            safe_get(row, 3, ""),
            safe_get(row, 4, ""),
            safe_get(row, 5, None),
            safe_get(row, 6, None),
            safe_get(row, 7, None),
            safe_get(row, 8, None),   # name → NULL if empty
            safe_get(row, 9, None),
            safe_get(row, 10, "")
        ))

    if data_to_insert:
        cursor.executemany(query, data_to_insert)
        conn.commit()
        print(f"Inserted {len(data_to_insert)} rows")


# 🔥 HANDLE CLIENT (BATCH STREAMING)
def handle_client(client_socket, cursor, conn):
    buffer = ""

    while True:
        chunk = client_socket.recv(1024).decode()
        if not chunk:
            break

        buffer += chunk

        while "---END_BATCH---" in buffer:
            batch, buffer = buffer.split("---END_BATCH---", 1)

            print("\n--- Processing Batch ---")

            rows = parse_csv(batch)

            clean_rows = []

            for row in rows:
                if not row:
                    continue

                #  skip bad rows
                if len(row) < 2:
                    continue

                #  skip delimiter garbage
                if row[0].startswith("---"):
                    continue

                clean_rows.append(row)

            print("Clean rows:", len(clean_rows))

            if clean_rows:
                print("First row:", clean_rows[0])
                insert_rows(cursor, conn, clean_rows)

    client_socket.sendall(b"FILE PROCESSED")


#  SERVER START
def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen(5)

    print(f"Server running on {HOST}:{PORT}...")

    #  SINGLE DB CONNECTION
    conn = get_connection()
    cursor = conn.cursor()

    while True:
        client_socket, addr = server.accept()
        print("\nConnected:", addr)

        try:
            handle_client(client_socket, cursor, conn)
        except Exception as e:
            print("Error:", e)
            client_socket.sendall(b"ERROR")
        finally:
            client_socket.close()


if __name__ == "__main__":
    start_server()