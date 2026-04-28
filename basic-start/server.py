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

if __name__ == "__main__":
    app.run(debug=True) 