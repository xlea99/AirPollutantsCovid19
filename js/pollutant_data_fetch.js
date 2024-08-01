// ==============================================
// This file is NOT run during normal program execution. It is included to display
// how I collected all OpenAQ data for this project. Using these functions combined
// with OpenAQ's API, I downloaded all data used into a single JSON, as well as did
// some early preparation/cleaning here.
// ==============================================


//region === Helpers ===

// This helper method was used to acquire the OpenAQ ID values for the specific cities
// we want to pull data from.
async function fetchCitiesInUS() {
    const baseUrl = 'https://api.openaq.org/v2/cities';
    const country = 'US';
    const limit = 1000;
    const url = `${baseUrl}?country=${country}&limit=${limit}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data); // Display the data in the console
        return data.results;
    } catch (error) {
        console.error('Failed to fetch cities:', error);
    }
}
// This function was used simply to generate a list of city codes as OpenAQ recognizes them,
// to avoid guesswork on specific semantics.
async function displayCityNames() {
    let cityResults = await fetchCitiesInUS();
    if (cityResults) {
        let allCities = []
        cityResults.forEach(singleResult => {
            allCities.push(singleResult.city)
        });
        console.info(allCities)
    }
}

// Simple sleep function to avoid too-many-request errors.
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//endregion === Helpers ===

//region === Data Acquisition & Preparation ===

// This function allows us to fetch all air quality data for the specific location with the specific
// pollutant (parameter) between startDate and endDate from OpenAQ. It contains logic for handling "too many requests"
// 429 error codes by introducing dynamic wait times.
async function fetchRawAirQualityData(pollutant, city, startDate, endDate) {
    const baseUrl = `https://api.openaq.org/v2/measurements`;
    const url = `${baseUrl}?city=${city}&parameter=${pollutant}&date_from=${startDate}&date_to=${endDate}&limit=10000`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.results;
        } else if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 30;
            console.log(`Rate limit hit, retrying after ${retryAfter} seconds.`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return fetchRawAirQualityData(pollutant, city, startDate, endDate);
        } else {
            throw new Error(`API responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

// This method aggregates the raw data pulled from OpenAQ by a specific city, in accordance to our needs.
// Specifically, it flattens each reading that exists to disregard sublocation (locations within the city)
// and calculates average readings by date, rather than specific by-hour readings, so that we can get
// a better generalized view of what the average pollutant value was by each day in the given city.
function aggregateData(data) {
    const aggregatedData = {};

    // Here we prepare a count and pollutant value sum by date, as we don't need
    // data specified by time, only by date.
    data.forEach(entry => {
        // Extract only the date, discard time
        const date = entry.date.utc.substring(0, 10);
        if (!aggregatedData[date]) {
            aggregatedData[date] = {
                sum: 0,
                count: 0
            };
        }
        aggregatedData[date].sum += entry.value;
        aggregatedData[date].count++;
    });

    // Now we calculate the per-day averages.
    const result = [];
    for (const [date, { sum, count }] of Object.entries(aggregatedData)) {
        result.push({
            date: date,
            average: sum / count,
            readingCount: count
        });
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.info("Completed aggregation!")
    return result;
}

// This method fetches, aggregates, and cleans all data for all given pollutant for the given city.
async function fetchFullAirQualityData(parameter,city,startDate,endDate) {
    const rawCityData = await fetchRawAirQualityData(parameter,city,startDate,endDate)
    return aggregateData(rawCityData)
}

const targetPollutants = ["pm25", "so2", "no2"];
const targetCities = ["Chicago-Naperville-Joliet",
    "Seattle-Tacoma-Bellevue",
    "New York-Northern New Jersey-Long Island",
    "Miami-Fort Lauderdale-Miami Beach",
    "Los Angeles-Long Beach-Santa Ana"];

// "Main" function of this file, responsible for actually fetching and pre-processing the data from OpenAQ.
async function fetchAndProcessAllData(startDate, endDate) {
    let allData = [];

    for (const city of targetCities) {
        let cityData = { city: city };

        for (const pollutant of targetPollutants) {
            console.log(`Fetching data for ${city}, pollutant: ${pollutant}`);
            cityData[pollutant] = await fetchFullAirQualityData(pollutant, city, startDate, endDate);
            await sleep(1000); // Wait for (at least) 1 second before the next request
        }

        allData.push(cityData);
    }

    return allData;
}


//endregion === Data Acquisition & Preparation ===

// This was what was run to acquire the data.
//fetchAndProcessAllData("2020-09-01","2020-12-31")
