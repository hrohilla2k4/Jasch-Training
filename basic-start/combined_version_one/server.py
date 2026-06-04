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


# =========================
# CHART API
# =========================
@app.route("/api/data/chart", methods=["GET"])
def get_chart_data():

    from datetime import datetime

    type_ = request.args.get("type")
    date = request.args.get("date")
    selected_pass = request.args.get("pass")
    coil_fk = request.args.get("coil_fk")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CALL sp_get_chart_data(%s, %s, %s)",
        (type_, date, coil_fk)
    )

    result = cursor.fetchall()

    conn.close()

    # =========================
    # PASS FILTERING
    # =========================
    if selected_pass:

        filtered_result = []

        current_pass = 1

        previous_direction = None

        for row in result:

            current_direction = str(
                row["direction"]
            )

            if previous_direction is not None:

                if current_direction != previous_direction:
                    current_pass += 1

            if str(current_pass) == str(selected_pass):
                filtered_result.append(row)

            previous_direction = current_direction

        result = filtered_result


    labels = []
    values = []

    cumulative_length = 0

    previous_time = None

    for row in result:

        current_time = datetime.strptime(
            str(row["time_col"]),
            "%H:%M:%S"
        )

        if previous_time is not None:

            delta_minutes = (
                current_time - previous_time
            ).total_seconds() / 60

            speed = float(
                row["line_speed"] or 0
            )

            length = delta_minutes * speed

            cumulative_length += length

        labels.append(
            round(cumulative_length, 2)
        )

        if type_ == "actual":

            values.append(
                float(row["value"])
            )

        else:

            values.append(
                float(row["value"]) -
                float(row["set_point"])
            )

        previous_time = current_time

    return jsonify({
        "labels": labels,
        "values": values
    })


# =========================
# HISTOGRAM API
# =========================
@app.route("/api/data/histogram", methods=["GET"])
def get_histogram_data():

    coil_fk = request.args.get("coil_fk")
    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CALL sp_get_histogram_data(%s, %s)",
        (coil_fk, date)
    )

    result = cursor.fetchall()

    conn.close()

    for row in result:
        row["time_col"] = str(row["time_col"])

    return jsonify({
        "raw": result
    })


# =========================
# COIL DROPDOWN API
# =========================
@app.route("/api/coils", methods=["GET"])
def get_coil_ids():

    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CALL sp_get_coils(%s)",
        (date,)
    )

    result = cursor.fetchall()

    print("RESULT =", result)

    conn.close()

    return jsonify(result)



@app.route("/api/set-points", methods=["GET"])
def get_set_points():

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT DISTINCT set_point
        FROM production_data;
    """

    cursor.execute(query)

    result = cursor.fetchall()

    conn.close()

    return jsonify(result)



@app.route("/api/passes", methods=["GET"])
def get_pass_data():

    coil_fk = request.args.get("coil_fk")
    date = request.args.get("date")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CALL sp_get_pass_data(%s, %s)",
        (coil_fk, date)
    )

    result = cursor.fetchall()

    conn.close()

    for row in result:
        row["time_col"] = str(row["time_col"])

    return jsonify(result)



@app.route("/api/decision", methods=["GET"])
def coil_decision():

    coil_fk = request.args.get("coil_fk")
    date = request.args.get("date")

    deviation = float(
        request.args.get("deviation", 10)
    )

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "CALL sp_get_decision_data(%s, %s, %s)",
        (coil_fk, date, deviation)
    )

    result = cursor.fetchone()

    conn.close()

    percentage = float(
        result["in_range_percentage"] or 0
    )

    if percentage >= 95:
        decision = "BUY"

    elif percentage >= 80:
        decision = "REVIEW"

    else:
        decision = "REJECT"

    return jsonify({
        "coil_id": coil_fk,
        "in_range_percentage": percentage,
        "decision": decision
    })


# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    app.run(debug=True)