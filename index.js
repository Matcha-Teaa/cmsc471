// Constants
// Corresponds to the field names in myData
const METRICS_YEARS = {
    'GDP \n($ USD billions PPP)': [2018, 2019, 2020, 2021],
    'GDP per capita in $ (PPP)': [2018, 2019, 2020, 2021],
    'health expenditure \n% of GDP': [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
    'health expenditure \nper person': [2015, 2018, 2019],
    'unemployment (%)': [2018, 2021],
    'Military Spending as % of GDP': [2019, 2021]
}
const METRICS = Object.keys(METRICS_YEARS);

// Utility functions
function formatValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(0) + "m";
    } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + "k";
    } else {
        return value.toFixed(0);
    }
}

// Global variables
let current_country = "AFG";
let current_metric = 0;
let current_year = 2018;
let myChart = null;
let myChart2 = null;
let root = null;

// myData contains the preprocessed data
let myData = {};

// countries contains geojson of country boundaries
let countries = null;

// We can find the data for each country by searching for
// the matching ISO code in myData

// d3 color scale
let linearScale;
let colorScale;

// Loads CSV data and countries geojson
const loadData = async () => {
    myData = await d3.csv("./data-processed.csv");
    countries = await d3.json("./countries.json");
}

// Updates legend and maps
let leafletMaps = [];

// This function is called when dropdown value is changed
// Deletes existing legend and maps, and creates new legend and maps based on dropdown value
const updateMapsAndLegend = async () => {
    // Determines minimum and maximum values of current metric across all the years
    const columns = Object.keys(myData[0]).filter(key => key.includes(METRICS[current_metric]));

    let maxValue = -Infinity;
    let minValue = Infinity;

    columns.forEach(col => {
        maxValue = Math.max(maxValue, Math.max(...myData.map(d => d[col])));
        minValue = Math.min(minValue, Math.min(...myData.map(d => d[col])));
    });

    // D3 color scale
    // First converts value to be in range [0, 1]
    // Then converts the normalized value to a color
    linearScale = d3
        .scaleLinear()
        .domain([minValue, maxValue])
        .range([0, 1]);

    colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 1]);

    // D3 code to create the legend
    const legendContainer = d3.select(".legend").style("width", "100%").style("height", "30px");
    legendContainer.html("")    // remove the current legend

    const numStops = 8;
    const stopWidth = legendContainer.node().getBoundingClientRect().width / numStops;

    const stops = d3.range(numStops).map(i => ({
        offset: i / (numStops - 1),
        color: colorScale(i / (numStops - 1))
    }));

    const stopGroups = legendContainer.selectAll("g")
        .data(stops)
        .join("g")
        .attr("transform", (d, i) => `translate(${i * stopWidth}, 0)`);

    stopGroups.append("rect")
        .attr("width", stopWidth)
        .attr("height", "6px")
        .attr("fill", d => d.color);

    stopGroups.append("text")
        .text(d => formatValue(linearScale.invert(d.offset)))
        .attr("x", stopWidth / 2)
        .attr("y", "50%")
        .attr("dy", "0.8em")
        .attr("text-anchor", "middle")
        .attr("font-size", "0.9em")
        .attr("fill", "white")
        .attr("font-weight", "400")

    // D3 code to create dropdown2
    
    const select = d3.select("#myDropdown2");

    select.html("");
    
    // Get all the years that apply to the current metric
    const years = METRICS_YEARS[METRICS[current_metric]];
    
    const options = select.selectAll("#option")
        .data(years, d => (d, current_metric));
    
    options.enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d)

    // D3 code to create dropdown3

    const select3 = d3.select("#myDropdown3");

    select3.html("");
    
    const options3 = select3.selectAll("#option")
        .data(countries.features.sort((a, b) => d3.ascending(a.properties.name, b.properties.name)));
    
    options3.enter()
        .append("option")
        .attr("value", d => d.properties.adm0_iso)
        .text(d => d.properties.name)

    // Update the maps
    const mapRow = d3.select(".row.map");

    // Remove all existing elements
    mapRow.html("");
    leafletMaps = [];

    // Bind the years to the existing map elements (create a map for each year)
    const maps = mapRow.selectAll("#map")
        .data(years, d => (d, current_metric));

    // Add new map elements for each year
    maps.enter()
        .append("div")
        .text(d => d.toString())        // Add year above map
        .append("div")
        .attr("id", "map")
        .each(function (d) {
            const map = L.map(this).setView([50, 0], 1);

            // Uses value of current metric, and current year, to style the country
            function style(feature) {
                // Find this country in myData
                const match = myData.find(d => d["country"] == feature.properties.adm0_iso);
                const value = match ? match[METRICS[current_metric] + ` (${d})`] : null;

                return {
                    fillColor: value ? colorScale(linearScale(value)) : 'transparent',
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.7
                };
            }

            L.geoJson(countries, {
                style: style, onEachFeature: function (feature, layer) {
                    const match = myData.find(d => d["country"] == feature.properties.adm0_iso);

                    const value = match ? match[METRICS[current_metric] + ` (${d})`] : null;
                    // Create a tooltip with the feature's name
                    const tooltipContent = "<em>Country:</em> " + feature.properties.name + "<br><em>" + METRICS[current_metric] + ` (${d})` + ":</em> " + value;
                    const tooltipOptions = {
                        sticky: true // Make the tooltip stay open on hover
                    };
                    const tooltip = L.tooltip(tooltipOptions).setContent(tooltipContent);

                    // Bind the tooltip to the feature's layer
                    layer.bindTooltip(tooltip);

                    layer.on('click', function() {
                        current_country = feature.properties.adm0_iso;
                        console.log(current_country);
                        myChart.destroy();
                        myChart2.destroy();
                        makeChart();
                        makeChart2();
                    });
                }
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
        const ctx = document.getElementById('myChart');
        // console.log(myData);

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: myData.map(row => row["country"]),
                datasets: [{
                    label: METRICS[current_metric],
                    data: myData.map(row => row[METRICS[current_metric] + ` (${current_year})`]),
                    borderWidth: 0,
                    backgroundColor: myData.map(row => row["country"] === current_country ? 'green' : '#c28ffe')
                }]
            },
            options: {
                animation: {
                    duration: 0,
                    easing: 'easeInOutQuad'
                },
                scales: {
                    y: {
                        type: "logarithmic",
                        beginAtZero: true
                    }
                }
            },
        });
    } catch (error) {
        console.log(error.message);
    }
};

const makeChart2 = async() => {
    if (dropdown3 != null) {
        if (dropdown3.value !== current_country) {
            dropdown3.value = current_country;
        }
    }
    try {
        const ctx = document.getElementById('myChart2');

        console.log(current_country);
        console.log(myData.find(d => d.country === current_country));

        console.log(myData.find(d => d.country === current_country)[METRICS[current_metric] + ` (${current_year})`]);

        const years = METRICS_YEARS[METRICS[current_metric]];

        myChart2 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: METRICS_YEARS[METRICS[current_metric]],
                datasets: [{
                    label: METRICS[current_metric],
                    data: years.map(y => myData.find(d => d.country == current_country)[METRICS[current_metric] + ` (${y})`]),
                    borderWidth: 1,
                    fill: false,
                    borderColor: '#c28ffe',
                    // backgroundColor: myData.map(row => row["country"] === current_country ? 'green' : '#c28ffe')
                }]
            },
            options: {
                animation: {
                    duration: 100,
                    easing: 'easeInOutQuad'
                },
            }
        });
    } catch (error) {
        console.log(error.message);
    }
}

// creates the tree map
const createTreemap = async () => {
    root = am5.Root.new("chartdiv");

    console.log(root);

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
    let child = myData.map((row) => {
        return { name: row['country'], value: row[METRICS[current_metric]] }
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
    updateMapsAndLegend();
    myChart.destroy();
    myChart2.destroy();
    makeChart();
    makeChart2();
    // createTreemap()
});

// on change of second dropdown
const dropdown2 = document.getElementById('myDropdown2');
dropdown2.addEventListener('change', event => {
    current_year = parseInt(event.target.value);
    myChart.destroy();
    makeChart();
})

const dropdown3 = document.getElementById('myDropdown3');
dropdown3.addEventListener('change', event => {
    current_country = event.target.value;
    myChart.destroy();
    makeChart();
    myChart2.destroy();
    makeChart2();
})

// initial call
loadData().then(() => {
    // console.log(data);
    updateMapsAndLegend();
    makeChart();
    makeChart2();
    // createTreemap();
});