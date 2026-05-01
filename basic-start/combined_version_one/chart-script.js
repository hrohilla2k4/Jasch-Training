//Chart Script

// let chart;

let lineChart;

async function loadChartData() {
    const type = document.getElementById("chartTypeDropdown").value;
    const date = document.getElementById("datePicker").value;

    if (!date) {
        alert("Please select date");
        return;
    }

    const res = await fetch(
        `http://127.0.0.1:5000/api/data/chart?type=${type}&date=${date}`
    );

    const data = await res.json();

    console.log("Line Chart Data:", data);

    renderLineChart(data);
}


function renderLineChart(data) {
    const ctx = document
        .getElementById("lineChart")
        .getContext("2d");

    if (lineChart) {
        lineChart.destroy();
    }

    lineChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Thickness Data",
                data: data.values.map(Number),
                borderColor: "blue",
                borderWidth: 2,
                pointRadius: 1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 20
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("drawChartBtn");

    btn.addEventListener("click", function () {
        console.log("Draw chart clicked");
        loadChartData();
    });
});

