// const date = document.getElementById("datePicker").value;

async function loadDropDownData() {
    const date =
        document.getElementById("datePicker").value;

    if (!date) return;

    const response = await fetch(
        `http://127.0.0.1:5000/api/coils?date=${date}`
    );

    const data = await response.json();

    const dropdown =
        document.getElementById("coilDropdown");

    // clear old options
    dropdown.innerHTML = `
    <option value="">
        Select Coil ID
    </option>
`;
    data.forEach(coil => {
        const option =
            document.createElement("option");

        option.value = coil.id;
        option.textContent = coil.coil_id;

        dropdown.appendChild(option);
    });

    
}
loadDropDownData();

document.getElementById("datePicker")
.addEventListener("change", function () {
    console.log("date type changed");
    loadDropDownData(); 
});
