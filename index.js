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

let linearScale;
let colorScale;

// loads data and countries geojson
const loadData = async () => {
    myData = await d3.csv("./data-processed.csv");
    countries = await d3.json("./countries.json")
}
let leafletMaps = [];

function formatValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(0) + "m";
    } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + "k";
    } else {
        return value.toFixed(0);
    }
}

// Adds maps to page
const updateMaps = async () => {
    const columns = Object.keys(myData[0]).filter(key => key.includes(metrics[current_metric]));

    let maxValue = -Infinity;
    let minValue = Infinity;

    columns.forEach(col => {
        maxValue = Math.max(maxValue, Math.max(...myData.map(d => d[col])));
        minValue = Math.min(minValue, Math.min(...myData.map(d => d[col])));
    });

    linearScale = d3
        .scaleLinear()
        .domain([minValue, maxValue])
        .range([0, 1]);

    colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, 1]);

    const legendContainer = d3.select(".legend").style("width", "100%").style("height", "30px");

    legendContainer.html("")

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
            const map = L.map(this).setView([50, 0], 1);

            function style(feature) {
                const match = myData.find(d => d["country"] == feature.properties.adm0_iso);

                const value = match ? match[metrics[current_metric] + ` (${d})`] : null;

                // console.log(feature.properties.adm0_iso + ", " + value);

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
                    console.log(feature)
                    const match = myData.find(d => d["country"] == feature.properties.adm0_iso);

                    const value = match ? match[metrics[current_metric] + ` (${d})`] : null;
                    // Create a tooltip with the feature's name
                    const tooltipContent = "<em>Country:</em> " + feature.properties.name + "<br><em>" + metrics[current_metric] + ` (${d})` + ":</em> " + value;
                    const tooltipOptions = {
                        sticky: true // Make the tooltip stay open on hover
                    };
                    const tooltip = L.tooltip(tooltipOptions).setContent(tooltipContent);

                    // Bind the tooltip to the feature's layer
                    layer.bindTooltip(tooltip);
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