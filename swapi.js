// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http");
const https = require("https");

const cache = {};
let debug_mode = true;
let timeout = 5000;
let err_count = 0;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NOT_FOUND = 404;


async function requestAndCacheData(requestedTerm) {
    if (cache[requestedTerm]) {
        if (debug_mode) console.log("Using cached data for", requestedTerm);
        return cache[requestedTerm];
    }
    
    return new Promise((results, justification) => {
        let data = "";
        const req = https.get(`https://swapi.dev/api/${requestedTerm}`, { rejectUnauthorized: false }, (res) => {
            if (res.statusCode >= HTTP_STATUS_BAD_REQUEST) {
                err_count++;
                return justification(new Error(`Request failed with status code ${res.statusCode}`));
            }
            
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsedData = JSON.parse(data);
                    cache[requestedTerm] = parsedData; // Cache the result
                    results(parsedData);
                    if (debug_mode) {
                        console.log(`Successfully fetched data for ${requestedTerm}`);
                        console.log(`Cache size: ${Object.keys(cache).length}`);
                    }
                } catch (e) {
                    err_count++;
                    justification(e);
                }
            });
        }).on("error", (e) => {
            err_count++;
            justification(e);
        });
        
        req.setTimeout(timeout, () => {
            req.abort();
            err_count++;
            justification(new Error(`Request timeout for ${requestedTerm}`));
        });
    });
}

// Global variables for tracking state
let fetch_count = 0;
let total_size = 0;

async function printGalaxyObjects() {
    let lastId = 1;

    try {
        if (debug_mode) console.log("Starting data fetch...");
        fetch_count++;
        
        const character = await requestAndCacheData(`people/${  lastId}`);
        total_size += JSON.stringify(character).length;
        console.log("Character:", character.name);
        console.log("Height:", character.height);
        console.log("Mass:", character.mass);
        console.log("Birthday:", character.birth_year);
        if (character.films && character.films.length > 0) {
            console.log("Appears in", character.films.length, "films");
        }
        
        const starships = await requestAndCacheData("starships/?page=1");
        total_size += JSON.stringify(starships).length;
        console.log("\nTotal Starships:", starships.count);
        
        // Print first 3 starships with details
        const starshipsToPrint = 3;
        for (let i = 0; i < starshipsToPrint; i++) {
            if (i < starships.results.length) {
                const starship = starships.results[i];

                console.log(`\nStarship ${i+1}:`);
                console.log("Name:", starship.name);
                console.log("Model:", starship.model);
                console.log("Manufacturer:", starship.manufacturer);
                console.log("Cost:", starship.cost_in_credits !== "unknown" ? `${starship.cost_in_credits  } credits` : "unknown");
                console.log("Speed:", starship.max_atmosphering_speed);
                console.log("Hyperdrive Rating:", starship.hyperdrive_rating);
                if (starship.pilots && starship.pilots.length > 0) {
                    console.log("Pilots:", starship.pilots.length);
                }
            }
        }
        
        // Find planets with population > 1000000000 and diameter > 10000
        const minimalPopulation = 1000000000;
        const minimalDiameter = 10000;

        const planets = await requestAndCacheData("planets/?page=1");
        total_size += JSON.stringify(planets).length;
        console.log("\nLarge populated planets:");
        for (let i = 0; i < planets.results.length; i++) {
            const planet = planets.results[i];
            if (planet.population !== "unknown" && parseInt(planet.population) > minimalPopulation && 
                planet.diameter !== "unknown" && parseInt(planet.diameter) > minimalDiameter) {
                console.log(planet.name, "- Pop:", planet.population, "- Diameter:", planet.diameter, "- Climate:", planet.climate);
                const minimal_films = 0
                if (planet.films && planet.films.length > minimal_films) {
                    console.log(`  Appears in ${planet.films.length} films`);
                }
            }
        }
        
        // Get films and sort by release date, then print details
        const films = await requestAndCacheData("films/");
        total_size += JSON.stringify(films).length;
        const filmList = films.results;
        filmList.sort((a, b) => {
            return new Date(a.release_date) - new Date(b.release_date);
        });
        
        console.log("\nStar Wars Films in chronological order:");
        for (let i = 0; i < filmList.length; i++) {
            const film = filmList[i];
            console.log(`${i+1}. ${film.title} (${film.release_date})`);
            console.log(`   Director: ${film.director}`);
            console.log(`   Producer: ${film.producer}`);
            console.log(`   Characters: ${film.characters.length}`);
            console.log(`   Planets: ${film.planets.length}`);
        }
        
        // Get a vehicle and display details
        const maxVehicles = 4;
        if (lastId <= maxVehicles) {
            const vehicle = await requestAndCacheData(`vehicles/${  lastId}`);
            total_size += JSON.stringify(vehicle).length;
            console.log("\nFeatured Vehicle:");
            console.log("Name:", vehicle.name);
            console.log("Model:", vehicle.model);
            console.log("Manufacturer:", vehicle.manufacturer);
            console.log("Cost:", vehicle.cost_in_credits, "credits");
            console.log("Length:", vehicle.length);
            console.log("Crew Required:", vehicle.crew);
            console.log("Passengers:", vehicle.passengers);
            lastId++;  // Increment for next call
        }
        
        // Print stats
        if (debug_mode) {
            console.log("\nStats:");
            console.log("API Calls:", fetch_count);
            console.log("Cache Size:", Object.keys(cache).length);
            console.log("Total Data Size:", total_size, "bytes");
            console.log("Error Count:", err_count);
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}

// Process command line arguments
const slicesSize = 2;
const args = process.argv.slice(slicesSize);
if (args.includes("--no-debug")) {
    debug_mode = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        timeout = parseInt(args[index + 1]);
    }
}

// Create a simple HTTP server to display the results


const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(HTTP_STATUS_OK, { "Content-Type": "text/html" });
        res.end(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Star Wars API Demo</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        h1 { color: #FFE81F; background-color: #000; padding: 10px; }
                        button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
                        .footer { margin-top: 50px; font-size: 12px; color: #666; }
                        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>Star Wars API Demo</h1>
                    <p>This page demonstrates fetching data from the Star Wars API.</p>
                    <p>Check your console for the API results.</p>
                    <button onclick="fetchData()">Fetch Star Wars Data</button>
                    <div id="results"></div>
                    <script>
                        function fetchData() {
                            document.getElementById('results').innerHTML = '<p>Loading data...</p>';
                            fetch('/api')
                                .then(res => res.text())
                                .then(text => {
                                    alert('API request made! Check server console.');
                                    document.getElementById('results').innerHTML = '<p>Data fetched! Check server console.</p>';
                                })
                                .catch(err => {
                                    document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
                                });
                        }
                    </script>
                    <div class="footer">
                        <p>API calls: ${fetch_count} | Cache entries: ${Object.keys(cache).length} | Errors: ${err_count}</p>
                        <pre>Debug mode: ${debug_mode ? "ON" : "OFF"} | Timeout: ${timeout}ms</pre>
                    </div>
                </body>
            </html>
        `);
    } else if (req.url === "/api") {
        printGalaxyObjects();
        res.writeHead(HTTP_STATUS_OK, { "Content-Type": "text/plain" });
        res.end("Check server console for results");
    } else if (req.url === "/stats") {
        res.writeHead(HTTP_STATUS_OK, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            api_calls: fetch_count,
            cache_size: Object.keys(cache).length,
            data_size: total_size,
            errors: err_count,
            debug: debug_mode,
            timeout: timeout
        }));
    } else {

        res.writeHead(HTTP_STATUS_NOT_FOUND, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

const number_port = 3000;

const PORT = process.env.PORT || number_port;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
}); 
