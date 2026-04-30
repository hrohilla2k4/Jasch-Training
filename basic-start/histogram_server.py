from flask import Flask, request, jsonify
import pymysql
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="1234",
        database="practise",
        port=3300,
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route("/api/data", methods=["GET"])
def get_data():
    coil_fk = request.args.get("coil_fk")
    set_point = request.args.get("set_point")

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT time_col, actual_thickness, line_speed, set_point, date_col
        FROM production_data where coil_fk = 8 and set_point=1800
        ORDER BY time_col;
    """

    cursor.execute(query)
    result = cursor.fetchall()

    conn.close()

    # FIX: convert timedelta → string
    for row in result:
        row["time_col"] = str(row["time_col"])

    labels = [row["time_col"] for row in result]

    values = [
        float(row["actual_thickness"]) if row["actual_thickness"] is not None else 0
        for row in result
    ]

    return jsonify({
        "labels": labels,
        "values": values,
        "raw": result
    })

if __name__ == "__main__":
    app.run(debug=True) 