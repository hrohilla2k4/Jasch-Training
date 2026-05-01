const date = document.getElementById("datePicker").value;

async function loadDropDownData() {
    const response = await fetch(`http://127.0.0.1:5000/api/coils?date=${date}`);

    const setPoints = await fetch(`http://127.0.0.1:5000/api/set-points`)
    const data = await response.json();
    const setPointsData = await setPoints.json();   

    const dropdown = document.getElementById("coilDropdown");
    const set_points_dropdown = document.getElementById("setPointDropDown")
    console.log("Setdata = ", setPointsData); 

    data.forEach(coil => {
        const option = document.createElement("option");
        option.value = coil.id;          // DB primary key
        option.textContent = coil.coil_id; // Actual coil number
        dropdown.appendChild(option);
    });

    setPointsData.forEach(setPoint => {
        const option = document.createElement("option");
        option.value = setPoint.set_point;          
        option.textContent = setPoint.set_point; 
        set_points_dropdown.appendChild(option);
    });
}

loadDropDownData();