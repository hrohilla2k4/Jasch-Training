// Histogram Script

let rawData = [];
let chart = null;
let passWiseData = [];
let passRawData = [];
let currentFixedSetPoint = null;

async function loadData() {

    const date =
        document.getElementById("datePicker").value;

    const coilId =
        document.getElementById("coilDropdown").value;

    if (!date || !coilId) {
        alert("Please select Date and Coil ID");
        return;
    }

    const res = await fetch(
        `http://127.0.0.1:5000/api/data/histogram?date=${date}&coil_fk=${coilId}`
    );

    const data = await res.json();

    rawData = data.raw;

    applyDeviation();

    console.log(
        "Histogram API Data:",
        rawData
    );
}


// ==========================
// APPLY DEVIATION
// ==========================
function applyDeviation() {

    if (!rawData.length) {
        console.log("No data loaded");
        return;
    }

    const deviation = Number(
        document.getElementById("deviation").value
    );

    const selectedPass =
        document.getElementById("passDropdown").value;

    let filteredData = rawData;

    // ==========================
    // PASS FILTER
    // ==========================
    if (selectedPass) {

        const selected = passWiseData.find(
            p => p.passNumber == selectedPass
        );

        if (selected) {

            const passTimes = selected.rows.map(
                r => r.time_col
            );

            filteredData = rawData.filter(
                row =>
                    passTimes.includes(row.time_col)
            );
        }

        if (filteredData.length > 0) {

    const passSetPoint =
        Number(filteredData[0].set_point);

    currentFixedSetPoint =
        passSetPoint;

    document.getElementById(
        "selectedPassSetPoint"
    ).innerText =
        `Set Point: ${passSetPoint}`;
}
    }

    // ==========================
    // BUILD HISTOGRAM
    // ==========================
    const {
        bins,
        totalRows,
        inRangeRows
    } = buildHistogram(
        deviation,
        filteredData
    );

    console.log("FINAL BINS:", bins);

    // ==========================
    // TOTAL ROWS
    // ==========================
    document.getElementById(
        "totalLength"
    ).innerText =
        `Total Rows: ${totalRows}`;

    // ==========================
    // DRAW HISTOGRAM
    // ==========================
    drawHistogram(bins);

    // ==========================
    // PERCENTAGES
    // ==========================
    const inPct = totalRows
        ? (inRangeRows / totalRows) * 100
        : 0;

    const outPct = 100 - inPct;

    document.getElementById(
        "inRangePct"
    ).innerText =
        `In Range: ${inPct.toFixed(2)}%`;

    document.getElementById(
        "outRangePct"
    ).innerText =
        `Out of Range: ${outPct.toFixed(2)}%`;

    fetchDecision();
}


// ==========================
// DECISION
// ==========================
async function fetchDecision() {

    const coilId =
        document.getElementById("coilDropdown").value;

    const date =
        document.getElementById("datePicker").value;

    const deviation =
        document.getElementById("deviation").value;

    const res = await fetch(
        `http://127.0.0.1:5000/api/decision?coil_fk=${coilId}&date=${date}&deviation=${deviation}`
    );

    const data = await res.json();

    const decisionBox =
        document.getElementById("decisionBox");

    let message = "";

    if (data.decision === "BUY") {
        message = " BUY THIS COIL";
    }

    else if (data.decision === "REVIEW") {
        message = " REVIEW MANUALLY";
    }

    else {
        message = " DO NOT BUY THIS COIL";
    }

    decisionBox.innerHTML = `
        <div style="font-size:18px; font-weight:bold;">
            ${message}
        </div>
    `;

    if (data.decision === "BUY") {
        decisionBox.style.color = "green";
    }

    else if (data.decision === "REVIEW") {
        decisionBox.style.color = "orange";
    }

    else {
        decisionBox.style.color = "red";
    }
}


// ==========================
// TIME PARSER
// ==========================
function parseTime(row) {

    return new Date(row.date_col).getTime() +
           timeToMs(row.time_col);
}

function timeToMs(timeStr) {

    const [hh, mm, ss] =
        timeStr.split(":").map(Number);

    return (
        (
            (hh * 3600) +
            (mm * 60) +
            ss
        ) * 1000
    );
}


// ==========================
// HISTOGRAM CORE
// ==========================
function buildHistogram(
    deviation,
    dataset
) {

    const bins = {};

    let totalRows = 0;

    let inRangeRows = 0;

    // ==========================
    // CREATE BINS
    // ==========================
    for (
        let i = -deviation;
        i <= deviation;
        i++
    ) {
        bins[i] = 0;
    }

    // ==========================
    // SORT
    // ==========================
    const sorted = [...dataset].sort(
        (a, b) => {
            return parseTime(a) - parseTime(b);
        }
    );

    if (!sorted.length) {

        return {
            bins,
            totalRows,
            inRangeRows
        };
    }

    // ==========================
    // FIXED SETPOINT
    // ==========================
    const fixedSetPoint =
    currentFixedSetPoint;

    console.log(
    "FIXED SETPOINT = ",
    fixedSetPoint
);
    // ==========================
    // LOOP
    // ==========================
    for (let i = 0; i < sorted.length; i++) {

        const curr = sorted[i];

        const value =
            Number(curr.actual_thickness);

        if (isNaN(value)) {
            continue;
        }

        totalRows++;

        let rawDev =
            value - fixedSetPoint;

        let dev =
            Math.trunc(rawDev);

        // ==========================
        // CLAMP
        // ==========================
        if (dev < -deviation) {
            dev = -deviation;
        }

        if (dev > deviation) {
            dev = deviation;
        }

        bins[dev] += 1;

        // ==========================
        // INRANGE
        // ==========================
        if (
            value >=
                (fixedSetPoint - deviation)

            &&

            value <=
                (fixedSetPoint + deviation)
        ) {

            inRangeRows++;
        }
    }

    return {
        bins,
        totalRows,
        inRangeRows
    };
}


// ==========================
// DRAW HISTOGRAM
// ==========================
function drawHistogram(bins) {

    console.log(
        "Entering into drawHistogram"
    );

    const labels = Object.keys(bins)
        .map(Number)
        .sort((a, b) => a - b);

    const values = labels.map(
        l => bins[l]
    );

    console.log(
        "Chart Values:",
        values
    );

    const ctx =
        document
            .getElementById("histogramchart")
            .getContext("2d");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [
                {
                    label:
                        "Deviation Distribution (Rows)",

                    data: values
                }
            ]
        },

        options: {

            responsive: true,

            scales: {

                x: {
                    title: {
                        display: true,
                        text: "Deviation"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Rows"
                    },

                    beginAtZero: true
                }
            }
        }
    });
}


// ==========================
// PASS GENERATION
// ==========================
function generatePasses() {

    const dropdown =
        document.getElementById(
            "passDropdown"
        );

    dropdown.innerHTML = `
        <option value="">
            All Passes
        </option>
    `;

    passWiseData = [];

    if (!passRawData.length) {
        console.log("No raw data found");
        return;
    }

    const sortedData =
        [...passRawData].sort(
            (a, b) => {
                return (
                    parseTime(a) -
                    parseTime(b)
                );
            }
        );

    let currentPass = 1;

    let prevDirection =
        String(sortedData[0].direction);

    let currentPassRows = [];

    sortedData.forEach((row) => {

        const currentDirection =
            String(row.direction);

        if (
            currentDirection !==
            prevDirection
        ) {

            passWiseData.push({

                passNumber:
                    currentPass,

                direction:
                    prevDirection,

                rows:
                    [...currentPassRows]
            });

            currentPass++;

            currentPassRows = [];
        }

        currentPassRows.push(row);

        prevDirection =
            currentDirection;
    });

    if (currentPassRows.length > 0) {

        passWiseData.push({

            passNumber:
                currentPass,

            direction:
                prevDirection,

            rows:
                [...currentPassRows]
        });
    }

    console.log(
        "Generated Passes:",
        passWiseData
    );

    // ==========================
    // DROPDOWN
    // ==========================
    passWiseData.forEach(pass => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            pass.passNumber;

        option.textContent =
            `${pass.direction} (Pass ${pass.passNumber})`;

        dropdown.appendChild(option);
    });

    if (passWiseData.length > 0) {

        dropdown.value =
            passWiseData[0].passNumber;
    }

    document.getElementById(
        "totalPasses"
    ).innerText =
        `Total Passes: ${passWiseData.length}`;
}


// ==========================
// LOAD PASS DATA
// ==========================
async function loadPassData() {

    const date =
        document.getElementById(
            "datePicker"
        ).value;

    const coilId =
        document.getElementById(
            "coilDropdown"
        ).value;

    if (!date || !coilId) {
        return;
    }

    const res = await fetch(
        `http://127.0.0.1:5000/api/passes?date=${date}&coil_fk=${coilId}`
    );

    const data =
        await res.json();

    passRawData = data;

    generatePasses();
}


// ==========================
// EVENTS
// ==========================
document.getElementById(
    "coilDropdown"
).addEventListener(
    "change",
    async function () {

        await loadPassData();

        await loadChartData();

        await loadData();
    }
);


document.getElementById(
    "deviation"
).addEventListener(
    "input",
    function () {

        if (!rawData.length) {
            return;
        }

        applyDeviation();
    }
);


document.getElementById(
    "passDropdown"
).addEventListener(
    "change",
    async function () {

        await loadChartData();

        applyDeviation();
    }
);