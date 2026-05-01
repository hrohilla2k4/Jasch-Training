# Server.py

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

@app.route("/api/data/chart", methods=["GET"])
def get_chart_data():
    type_ = request.args.get("type")
    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
    ROUND(
        SUM(line_speed) OVER (ORDER BY time_col) / 60, 2
    ) AS label,   -- cumulative length

    AVG(
        CASE 
            WHEN %s = 'actual' THEN actual_thickness
            ELSE (actual_thickness - set_point)
        END
    ) AS value

FROM production_data
WHERE date_col = %s
GROUP BY time_col
ORDER BY time_col;
    """

    cursor.execute(query, (type_, date))
    result = cursor.fetchall()

    conn.close()

    labels = [row["label"] for row in result]
    values = [row["value"] for row in result]

    return jsonify({
        "labels": labels,
        "values": values
    })

@app.route("/api/data/histogram", methods=["GET"])
def get_histogram_data():
    coil_fk = request.args.get("coil_fk")
    set_point = request.args.get("set_point")
    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT time_col, actual_thickness, line_speed, set_point, date_col
        FROM production_data
        WHERE coil_fk = %s
        AND set_point = %s
        AND date_col = %s
        ORDER BY time_col;
    """

    cursor.execute(query, (coil_fk, set_point, date))
    result = cursor.fetchall()

    conn.close()

    for row in result:
        row["time_col"] = str(row["time_col"])

    return jsonify({
        "raw": result
    })


@app.route("/api/coils", methods=["GET"])
def get_coil_ids():
    conn = get_connection()
    cursor = conn.cursor()
    date = request.args.get("date")

    query = """
        SELECT id, coil_id
        FROM coil_info where date_created = %s 
        ORDER BY id DESC;
    """

    cursor.execute(query, (date))
    result = cursor.fetchall()

    conn.close()

    return jsonify(result)

@app.route("/api/set-points", methods=["GET"])
def get_set_points():
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT distinct set_point
        FROM production_data;
    """

    cursor.execute(query)
    result = cursor.fetchall()

    conn.close()

    return jsonify(result)



if __name__ == "__main__":
    app.run(debug=True) 