    let chart;

async function loadData() {
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;

    const res = await fetch(`http://127.0.0.1:5000/api/data?type=${type}&date=${date}`);
    const data = await res.json();

    console.log("Labels:", data.labels.slice(0, 10));
    console.log("Values:", data.values.slice(0, 10));
    console.log("Total:", data.values.length);

    renderChart(data);
}

// function loadData() {
//     const data = {
//         labels: ["10AM", "11AM", "12PM", "1PM", "2PM"],
//         values: [10, 25, 15, 30, 20]
//     };

//     renderChart(data);
// }

function renderChart(data) {
    const ctx = document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels, // 🔥 now coming from DB
            datasets: [{
                label: 'Values',
                data: data.values.map(Number),
                borderColor: 'blue',
                borderWidth: 2,
                pointRadius: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 20   // 🔥 prevents overcrowding
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// function renderChart(data) {
//     const ctx = document.getElementById("chart").getContext("2d");

//     if (chart) chart.destroy();

//     chart = new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: data.labels,
//             datasets: [{
//                 label: 'Test Data',
//                 data: data.values,
//                 borderWidth: 2,
//                 borderColor: 'blue',
//                 pointRadius: 5,
//                 fill: false
//             }]
//         },
//         options: {
//             responsive: true
//         }
//     });
// }