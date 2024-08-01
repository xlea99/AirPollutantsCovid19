// Read stored pollutant and traffic data from local storage.
const pollutantData = JSON.parse(localStorage.getItem('pollutantData'));
const trafficData = JSON.parse(localStorage.getItem('trafficData'));

// This function handles dynamically updating all visualizations (and the pollutant description) on certain actions.
// We also ensure that the page is initially updated.
function updateVisualizations() {
    // Get currently selected user variables
    const selectedCity = document.getElementById('city-select').value;
    const selectedPollutant = document.getElementById('pollutant-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Update the time series chart
    renderTimeSeriesNormalized(selectedCity, selectedPollutant,startDate, endDate);

    // Update the comparative bar chart
    renderBarChart(selectedCity, selectedPollutant);

    // Update the scatter plot
    renderScatterPlot(selectedCity, selectedPollutant);

    // Update the pollutant description
    const pollutantDescriptions = {
        'pm25': 'Particulate matter less than 2.5 micrometers in diameter (PM2.5) are fine inhalable particles, with diameters that are generally 2.5 micrometers and smaller. They originate from a variety of sources, including power plants, motor vehicles, airplane emissions, residential wood burning, and certain industrial processes. PM2.5 can penetrate deeply into the respiratory system, posing significant health risks.',
        'so2': 'Sulfur dioxide (SO2) is a gas produced by volcanic eruptions and in various industrial processes. Coal and petroleum often contain sulfur compounds, and their combustion generates sulfur dioxide.',
        'no2': 'Nitrogen dioxide (NO2) is one of a group of highly reactive gasses known as "oxides of nitrogen," or "nitrogen oxides (NOx)." Other nitrogen oxides include nitrous acid and nitric acid. NO2 forms from emissions from cars, trucks and buses, power plants, and off-road equipment.'
    };
    const descriptionDiv = document.getElementById('description');
    descriptionDiv.innerHTML = `<strong>${selectedPollutant.toUpperCase()}:</strong> ${pollutantDescriptions[selectedPollutant]}`;
}
window.onload = () => {
    updateVisualizations();  // This will run when the page loads
};
// We then add a listener to trigger updateVisualizations when any of the dropdowns or date boxes are changed.
document.addEventListener('DOMContentLoaded', function() {
    const controls = ['city-select', 'pollutant-select', 'start-date', 'end-date'];
    controls.forEach(controlId => {
        document.getElementById(controlId).addEventListener('change', updateVisualizations);
    });
});


// Helper function to merge/compare data between both traffic and pollutant data, for the given city.
function mergeData(city, pollutant) {
    const mergedData = [];
    const aqData = pollutantData[city][pollutant];

    trafficData[city].forEach(traffic => {
        const aqEntry = aqData.find(aq => aq.date === traffic.date);
        if (aqEntry) {
            mergedData.push({
                date: traffic.date,
                transitChange: traffic.transitChange,
                pm25: aqEntry.value
            });
        }
    });

    return mergedData;
}
// Helper functions to normalize both types of data.
function normalizePollutantData(city,pollutant) {
    const targetData = pollutantData[city][pollutant]
    const maxVal = d3.max(targetData, d => +d.value);
    const minVal = d3.min(targetData, d => +d.value);
    return targetData.map(d => ({
        date: d.date,
        originalValue: d.value,
        normalizedValue: (d.value - minVal) / (maxVal - minVal)
    }));
}
function normalizeTrafficData(city) {
    const targetData = trafficData[city]
    const maxVal = d3.max(targetData, d => +d.transitChange);
    const minVal = d3.min(targetData, d => +d.transitChange);
    return targetData.map(d => ({
        date: d.date,
        normalizedValue: (d.transitChange - minVal) / (maxVal - minVal),
        originalValue: d.transitChange
    }));
}
// Function to display a simple time series line graph, displaying normalized pollutant and traffic data
// over the given time for the given city.
function renderTimeSeriesNormalized(city,pollutant,startDate, endDate) {
    // Set up and normalize data
    let normalizedTrafficData = normalizeTrafficData(city)
    normalizedTrafficData = normalizedTrafficData.filter(d => d.date >= startDate && d.date <= endDate);
    let normalizedPollutantData = normalizePollutantData(city,pollutant)
    normalizedPollutantData = normalizedPollutantData.filter(d => d.date >= startDate && d.date <= endDate);

    // Set graph dimensions and margins
    const margin = {top: 50, right: 200, bottom: 30, left: 60},
        width = 1460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Append the svg object to the body of the page
    const svg = d3.select("#linegraph")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .text(`Normalized Pollutant and Traffic Activity over Time for ${city}`)

    // x axis
    const x = d3.scaleTime()
        .domain(d3.extent(normalizedPollutantData, d => new Date(d.date)))
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    //  y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(normalizedPollutantData, d => +d.normalizedValue)])
        .range([ height, 0 ]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // setup tooltips for both traffic and pollutant data
    const tooltip = d3.select("#tooltip");
    svg.selectAll(".pollutant-circle")
        .data(normalizedPollutantData)
        .enter()
        .append("circle")
        .attr("class", "pollutant-circle")
        .attr("cx", d => x(new Date(d.date)))
        .attr("cy", d => y(d.normalizedValue))
        .attr("r", 3)
        .attr("fill", "#2c3e50")
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .html(`Date: ${d.date}<br>Pollutant Reading: ${d.originalValue.toFixed(5)}<br>Normalized Value: ${d.normalizedValue.toFixed(5)}`)
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });
    svg.selectAll(".traffic-circle")
        .data(normalizedTrafficData)
        .enter()
        .append("circle")
        .attr("class", "traffic-circle")
        .attr("cx", d => x(new Date(d.date)))
        .attr("cy", d => y(d.normalizedValue))
        .attr("r", 6)
        .attr("fill", "#2ecc71")
        .style("opacity",0)
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .html(`Date: ${d.date}<br>Transit Change: ${d.originalValue.toFixed(2)}<br>Normalized Value: ${d.normalizedValue.toFixed(5)}`)
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Plot pollutant data
    svg.append("path")
        .datum(normalizedPollutantData)
        .attr("fill", "none")
        .attr("stroke", "#3498db")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => x(new Date(d.date)))
            .y(d => y(d.normalizedValue))
        );

    // Adjust y-axis for normalized traffic data, then plot
    const yTraffic = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);
    svg.append("path")
        .datum(normalizedTrafficData)
        .attr("fill", "none")
        .attr("stroke", "#2ecc71")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => x(new Date(d.date)))
            .y(d => yTraffic(d.normalizedValue))
        );

    // x axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width/2 + margin.left)
        .attr("y", height + margin.bottom - 5)
        .text("Date")
        .style("fill", "#2c3e50")
        .style("font-size", "14px")
        .style("font-weight", "bold");
    // y axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top - height/2 + 20)
        .text("Normalized Value")
        .style("fill", "#2c3e50")
        .style("font-size", "14px")
        .style("font-weight", "bold");

    // key
    const keySize = 15;
    svg.append("rect").attr("x", width + 80).attr("y", 0).attr("width", keySize).attr("height", keySize).style("fill", "#3498db");
    svg.append("text").attr("x", width + 100).attr("y", 12).text("Pollutant Level").style("font-size", "15px").attr("alignment-baseline","middle");
    svg.append("rect").attr("x", width + 80).attr("y", 20).attr("width", keySize).attr("height", keySize).style("fill", "#2ecc71");
    svg.append("text").attr("x", width + 100).attr("y", 32).text("Traffic Activity").style("font-size", "15px").attr("alignment-baseline","middle");

}

// Function to display the bar chart containing the three "phases" of lockdown - before,
// during, and after.
function renderBarChart(city, pollutant) {
    // Define time periods
    const periods = {
        'Pre-Lockdown': {start: '2020-01-01', end: '2020-02-29'},
        'Lockdown': {start: '2020-03-01', end: '2020-05-31'},
        'Post-Lockdown': {start: '2020-06-01', end: '2020-12-31'}
    };

    // Calculate average values for each period
    let averages = [];
    for (let period in periods) {
        const { start, end } = periods[period];
        const periodData = pollutantData[city][pollutant].filter(d => d.date >= start && d.date <= end);
        const avgValue = d3.mean(periodData, d => d.value);
        averages.push({period, value: avgValue});
    }

    // set dimensions and margins
    const margin = {top: 40, right: 50, bottom: 40, left: 100},
        width = 700 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // Get svg
    const svg = d3.select("#barchart")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text(`Average Pollutant Levels by COVID-19 Phase for ${city}`)

    // x axis
    const x = d3.scaleBand()
        .range([ 0, width ])
        .domain(averages.map(d => d.period))
        .padding(0.2);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
    // y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(averages, d => d.value)])
        .range([ height, 0 ]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // Plot the bars themselves
    svg.selectAll("mybar")
        .data(averages)
        .enter()
        .append("rect")
        .attr("x", d => x(d.period))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("rx", 5)
        .attr("height", d => height - y(d.value))
        .attr("fill", "#34495e");

    // x axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width/2 + margin.left)
        .attr("y", height + margin.bottom - 5)
        .text("COVID-19 Phase")
        .style("fill", "#34495e")
        .style("font-size", "14px")
        .style("font-weight", "bold");
    // y axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top - height/2 + 20)
        .text(`Average ${pollutant} Value`)
        .style("fill", "#34495e")
        .style("font-size", "14px")
        .style("font-weight", "bold");

    // add labels inside the bars
    svg.selectAll("text.bar")
        .data(averages)
        .enter()
        .append("text")
        .attr("class", "bar")
        .attr("text-anchor", "middle")
        .attr("x", d => x(d.period) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) + 20)
        .text(d => d.value.toFixed(5))
        .style("fill", "white")
        .style("font-size", "14px");
}

// Helper function to calculate the slope and intercept for linear regression
function calculateLinearRegression(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.transitChange);
    const sumY = d3.sum(data, d => d.pm25);
    const sumXY = d3.sum(data, d => d.transitChange * d.pm25);
    const sumXX = d3.sum(data, d => d.transitChange * d.transitChange);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}
// Helper function to calculate Pearson correlation coefficient
function calculatePearsonCorrelation(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.transitChange);
    const sumY = d3.sum(data, d => d.pm25);
    const sumXY = d3.sum(data, d => d.transitChange * d.pm25);
    const sumXX = d3.sum(data, d => d.transitChange * d.transitChange);
    const sumYY = d3.sum(data, d => d.pm25 * d.pm25);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return numerator / denominator;
}
// Function to display the scatter plot displaying correlation between traffic and pollutants.
function renderScatterPlot(city, pollutant) {
    const mergedData = mergeData(city,pollutant);

    // set dimensions and margins
    const margin = {top: 40, right: 160, bottom: 40, left: 70},
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // Get/append svg object
    const svg = d3.select("#scatterplot")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text(`Normalized Pollutant and Traffic Activity over Time for ${city}`)


    // x axis
    const x = d3.scaleLinear()
        .domain(d3.extent(mergedData, d => d.transitChange))
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
    // y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(mergedData, d => d.pm25)])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // x axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width/2 + margin.left)
        .attr("y", height + margin.bottom - 5)
        .text("Change in Transit Station Visits (%)")
        .style("fill", "#34495e")
        .style("font-size", "14px")
        .style("font-weight", "bold");
    // y axis label
    svg.append("text")
        .style("font-size", "14px").style("font-weight", "bold")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top - height/2 + 20)
        .text(pollutant + " Level (µg/m³)");

    // Calculate trend line using linear regression
    const { slope, intercept } = calculateLinearRegression(mergedData);
    const trendData = mergedData.map(d => ({
        transitChange: d.transitChange,
        pm25: slope * d.transitChange + intercept
    }));
    // Draw the trend line
    svg.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 4)
        .attr("d", d3.line()
            .x(d => x(d.transitChange))
            .y(d => y(d.pm25))
        );

    // add "Trend" label to trend line
    svg.append("text")
        .attr("text-anchor", "left")
        .attr("alignment-baseline", "middle")
        .attr("x", x(trendData[trendData.length - 1].transitChange) - 40)
        .attr("y", y(trendData[trendData.length - 1].pm25) - 4)
        .text("Trend")
        .style("fill", "black")
        .style("opacity", "0.5")
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .style("user-select", "none");

    // Add each data dot
    const tooltip = d3.select("#tooltip");
    svg.selectAll("circle")
        .data(mergedData)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.transitChange))
        .attr("cy", d => y(d.pm25))
        .attr("r", 5)
        .style("fill", "#e74c3c")
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
            tooltip.html(`Date: ${d.date}<br>Transit Change: ${d.transitChange}%<br>${pollutant} Level: ${d.pm25.toFixed(6)} µg/m³`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Calculate the Pearson correlation coefficient, add to right margin
    const r = calculatePearsonCorrelation(mergedData);
    svg.append("text")
        .attr("x", width + margin.right / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`r = ${r.toFixed(2)}`);
    svg.append("text")
        .attr("x", width + margin.right / 2)
        .attr("y", margin.top + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(`(Pearson correlation coefficient)`);
}


