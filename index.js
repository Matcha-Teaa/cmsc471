// Constants
const years = {
    'GDP \n($ USD billions PPP)': [2018, 2019, 2020, 2021],
    'GDP per capita in $ (PPP)': [2018, 2019, 2020, 2021],
    'health expenditure \n% of GDP': [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
    'health expenditure \nper person': [2015, 2018, 2019],
    'unemployment (%)': [2018, 2021],
    'Military Spending as % of GDP': [2019, 2021]
}
const metrics = Object.keys(years);

// Global variables
let current_country = null;
let current_metric = 0;
let myChart = null;
let root = null;

let myData = {};
let countries = null;

// loads data and countries geojson
const loadData = async () => {
    myData = await d3.csv("./data-processed.csv");
    countries = await d3.json("./countries.json")
}

// generates the leaflet map and plots all the points
// const makeMap = async () => {
//     const titleSelect = document.querySelector('#info h1');
//     const textSelect = document.querySelector('#info p');
//     const data = await loadData()
//     var map = L.map('map').setView([15.505, 18.09], 1);
//     L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         maxZoom: 19,
//         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//     }).addTo(map);

//     data.forEach((row) => {

//         var purpIcon = new L.Icon({
//             iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
//             shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//             iconSize: [25, 41],
//             iconAnchor: [12, 41],
//             popupAnchor: [1, -34],
//             shadowSize: [41, 41]
//         });

//         var marker = L.marker([row["lat"], row["long"]], { icon: purpIcon }).addTo(map);
//         // on the click of the marker do ... 
//         marker.on("click", () => {
//             current_country = row['indicator']

//             if (myChart) {
//                 myChart.destroy();
//             }
//             if (root) {
//                 root.dispose()
//                 // jump2
//             }

//             // createTreemap()
//             const chartRow = document.querySelector('.row.chart');
//             if (chartRow.classList.contains('hide')) {
//                 chartRow.classList.remove('hide');
//             }
//             titleSelect.textContent = `${row["indicator"]}`
//             textSelect.innerHTML = `<b>ISO Country code: </b>${row["ISO Country code"]}<br><b>population: </b>${row["population"]}<br><b>GDP ($ USD billions PPP): </b>${row["GDP \n($ USD billions PPP)"]}<br><b>GDP per capita in $ (PPP): </b>${row["GDP per capita in $ (PPP)"]}<br><b>health expenditure % of GDP: </b>${row["health expenditure \n% of GDP"]}<br><b>health expenditure per person: </b>${row["health expenditure \nper person"]}<br><b>unemployment (%): </b>${row["unemployment (%)"]}<br><b>Military Spending as % of GDP: </b>${row["Military Spending as % of GDP"]}`;
//             makeChart("GDP \n($ USD billions PPP)")
//             var popupContent = `Name: ${row["indicator"]}<br>Lat: ${row["lat"]}<br>Long: ${row["long"]}`;
//             var popup = L.popup().setLatLng(marker.getLatLng()).setContent(popupContent);
//             popup.openOn(map);
//         })
//     });
// }
// makeMap()

let leafletMaps = [];

// Adds maps to page
const updateMaps = async () => {
    // Select the container element for the maps
    const mapRow = d3.select(".row.map");

    // Remove all existing elements
    mapRow.html("");
    leafletMaps = [];

    // Get the data for the current metric and years
    const data = years[metrics[current_metric]];

    // Bind the data to the existing map elements
    const maps = mapRow.selectAll("#map")
        .data(data, d => (d, current_metric));

    // Add new map elements for new data items
    maps.enter()
        .append("div")
        .text(d => d.toString())
        .append("div")
        .attr("id", "map")
        .each(function (d) {
            const map = L.map(this).setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
                maxZoom: 18,
            }).addTo(map);
            leafletMaps.push(map);
        })

    leafletMaps.forEach(m1 => {
        leafletMaps.forEach(m2 => {
            m1.sync(m2);
        })
    })
}

// creates the bar chart
const makeChart = async () => {
    try {
        const dataa = await loadData();
        const ctx = document.getElementById('myChart');
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dataa.map(row => row.indicator),
                datasets: [{
                    label: '# of Votes',
                    data: dataa.map(row => row[items[current_metric]]),
                    borderWidth: 0,
                    backgroundColor: dataa.map(row => row.indicator === current_country ? 'green' : '#c28ffe')
                }]
            },
            options: {
                animation: {
                    duration: 8000,
                    easing: 'easeInOutQuad'
                },
                scales: {
                    y: {
                        type: "logarithmic",
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.log(error.message);
    }
};

// creates the tree map
const createTreemap = async () => {
    const dataa = await loadData();
    const items = ['GDP \n($ USD billions PPP)', 'GDP per capita in $ (PPP)', 'health expenditure \n% of GDP', 'health expenditure \nper person', 'unemployment (%)', 'Military Spending as % of GDP']
    root = am5.Root.new("chartdiv");
    root.setThemes([am5themes_Dark.new(root)]);
    var container = root.container.children.push(
        am5.Container.new(root, {
            width: am5.percent(100),
            height: am5.percent(85),
            layout: root.verticalLayout
        })
    );
    var series = container.children.push(
        am5hierarchy.Treemap.new(root, {
            singleBranchOnly: false,
            downDepth: 1,
            upDepth: -1,
            initialDepth: 2,
            valueField: "value",
            categoryField: "name",
            childDataField: "children",
            nodePaddingOuter: 0,
            nodePaddingInner: 0,
        })
    );

    series.rectangles.template.setAll({ strokeWidth: 1 });
    let child = dataa.map((row) => {
        return { name: row['indicator'], value: row[items[current_metric]] }
    })
    var data = { name: "Root", children: child };
    series.rectangles.template.adapters.add("fillOpacity", function (fill, target) {
        if (target.dataItem.dataContext.name === current_country) { return 1 }
        else { return 0.5 }
    });
    series.data.setAll([data]);
    series.set("selectedDataItem", series.dataItems[0]);
    series.appear(10000, 1000);
}

// on change of dropdown
const dropdown = document.getElementById('myDropdown');
dropdown.addEventListener('change', event => {
    // console.log(event.target.value);
    // myChart.destroy();
    // root.dispose()
    // // jump1
    current_metric = parseInt(event.target.value);
    updateMaps();
    // makeChart()
    // // createTreemap()
});

// initial call
loadData().then(() => {
    // console.log(data);
    updateMaps();
});