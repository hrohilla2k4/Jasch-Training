// Histogram Script

let rawData = [];
let chart = null;


async function loadData() {
    const date = document.getElementById("datePicker").value;
    const coilId = document.getElementById("coilDropdown").value;
    const setPoint = document.getElementById("setPointDropDown").value;

    if (!date || !coilId || !setPoint) {
        alert("Please select Date, Coil ID and Set Point");
        return;
    }

    const res = await fetch(
        `http://127.0.0.1:5000/api/data/histogram?date=${date}&coil_fk=${coilId}&set_point=${setPoint}`
    );

    const data = await res.json();

    rawData = data.raw;

    console.log("Histogram API Data:", rawData);
}

// Modal open
function openModal() {
    document.getElementById("modal").style.display = "block";
}

function applyDeviation() {
    if (!rawData.length) {
        console.log("No data loaded");
        return;
    }

    const deviation = Number(document.getElementById("deviation").value);

    const { bins, totalLength, inRangeLength } =
        buildHistogram(deviation);

    console.log("FINAL BINS:", bins);
    console.log("TOTAL LENGTH:", totalLength);

    document.getElementById("totalLength").innerText =
    `Total Length: ${totalLength.toFixed(2)}`;

    drawHistogram(bins);

    const inPct = totalLength ? (inRangeLength / totalLength) * 100 : 0;
    const outPct = 100 - inPct;

    document.getElementById("inRangePct").innerText =
        `In Range: ${inPct.toFixed(2)}%`;

    document.getElementById("outRangePct").innerText =
        `Out of Range: ${outPct.toFixed(2)}%`;
}

// ✅ FIXED TIME PARSER
function parseTime(row) {
    return new Date(row.date_col).getTime() +
           timeToMs(row.time_col);
}

function timeToMs(timeStr) {
    const [hh, mm, ss] = timeStr.split(":").map(Number);
    return ((hh * 3600) + (mm * 60) + ss) * 1000;
}

// 🔥 CORE LOGIC (FINAL)
function buildHistogram(deviation) {
    debugger; 
    const bins = {};
    let totalLength = 0;
    let inRangeLength = 0;

    // create bins
    for (let i = -deviation; i <= deviation; i++) {
        bins[i] = 0;
    }

    // ✅ FIXED SORT (IMPORTANT)
    const sorted = [...rawData].sort((a, b) => {
        return parseTime(a) - parseTime(b);
    });

    for (let i = 1; i < sorted.length; i++) {

        const prev = sorted[i - 1];
        const curr = sorted[i];

        const t1 = parseTime(prev);
        const t2 = parseTime(curr);

        const deltaTime = ((t2 - t1) / 1000)/60;
        

        if (!deltaTime || deltaTime <= 0) continue;

        const speed = Number(curr.line_speed);
        const value = Number(curr.actual_thickness);
        const setpoint =Number(curr.set_point); //  FIXED HERE

        if (isNaN(speed) || isNaN(value) || isNaN(setpoint)) {
            console.log(" Skipping bad row:", curr);
            continue;
        }

        const length = deltaTime * speed;

        if (length <= 0) continue;

        totalLength += length;
        // console.log("Added into total length = ", length);

        let rawDev = value - setpoint;
        let dev = Math.round(rawDev);

        // clamp
        if (dev < -deviation) dev = -deviation;
        if (dev > deviation) dev = deviation;

        bins[dev] += length;

        if (rawDev >= -deviation && rawDev <= deviation) {
            inRangeLength += length;
        }
    }

    return { bins, totalLength, inRangeLength };
}

// 🔥 DRAW CHART
function drawHistogram(bins) {

    console.log("Entering into drawHistogram")
    const labels = Object.keys(bins)
        .map(Number)
        .sort((a, b) => a - b);

    const values = labels.map(l => bins[l]);

    console.log("Chart Values:", values);

    const ctx = document.getElementById("histogramchart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Deviation Distribution (Length)',
                data: values
            }]
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
                        text: "Coil Length"
                    },
                    beginAtZero: true
                }
            }
        }
    });
}


document.addEventListener("DOMContentLoaded", function () {
    const histogramBtn = document.getElementById("drawHistogramBtn");

    histogramBtn.addEventListener("click", async function () {
        console.log("Draw Histogram button clicked");

        await loadData();

        console.log("Data loaded successfully");

        openModal();   // remove this if you don't want modal
    });
});