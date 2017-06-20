var http = require('http');
var fs = require ("fs")


// creates local server with all the code
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});

    var rawData = fs.readFileSync("text.txt"); // reads a JSON file which is a 'set'
    var set = JSON.parse(rawData); // a set file is parsed

    // find undesired properties and add them to array
    var propsToDelete = [];
    for (var i in set) {
        if (i !== 'title' && i !== 'created_by' &&
        i !== 'term_count' && i !== 'terms') {
            delete set[i];
        }
    }
    // find undesired properties again, this time in terms
    propsToDelete = [];
    for (var i = 0; i < set.terms.length; i++) {
        for (var j in set.terms[i]) {
            if (j !== 'term' && j !== 'definition') {
                delete set.terms[i][j];
            }
        }
    }

    // prints out the key:value
    var output = '';
    for (var i in set) {
    	if (i === 'terms') {
    		output += "\n Terms are: "
    		for (var j in set[i]) {
    			output += set[i][j].term + "=" + set[i][j].definition;
    		}
    	} else {
    		output += "\n Key is: " + i + " Value is: " + set[i];
    	}
    	output += "\n";
    }
    


    res.end(output);
}).listen(8080);


// To run just type node jsontest.js in CL
// then go to localhost:8080


