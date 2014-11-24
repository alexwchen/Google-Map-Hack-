// Keep track of all of the vehicles currently within the query
var vehiclesInQuery = {};


var transitRef = new Firebase('https://publicdata-transit.firebaseio.com/sf-muni');
var lineIndex = transitRef.child('vehicles');
lineIndex.on('child_added', function(snapshot) {

    console.log('-----------');
    console.log('child_added');
    console.log(snapshot.key(), snapshot.val());
    console.log('-----------');
    var id = snapshot.key();

    transitRef.child('vehicles').child(id).on('value', busUpdated);

    // Get the vehicle data from the Open Data Set
    vehicle = snapshot.val();
    vehicleId = vehicle.id;
    vehiclesInQuery[vehicleId] = true;


    // Create a new marker for the vehicle
    vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
    vehiclesInQuery[vehicleId] = vehicle;

});


lineIndex.on('child_removed', function(snapshot) {

  console.log('-----------');
  console.log('child_removed');
  console.log('-----------');


    var vehicleId = snapshot.key();
    transitRef.child('data').child(vehicleId).off('value', busUpdated);

    // Remove the vehicle from the list of vehicles in the query
    delete vehiclesInQuery[vehicleId];

});

lineIndex.on('child_changed', function(snapshot) {

  console.log('-----------');
  console.log('child_changed');
  console.log('-----------');
  // Get the vehicle data from the Open Data Set
  vehicleNew = snapshot.val();

  vehicleId = vehicleNew.id;
  var vehicle = vehiclesInQuery[vehicleId];

  var loc_obj = [vehicleNew.lat, vehicleNew.lon];

  if (typeof vehicle !== "undefined" && typeof vehicle.marker !== "undefined") {
    vehicle.marker.animatedMoveTo(loc_obj,vehicle);
  }


});

function busUpdated(snapshot) {

    // Bus line 'X' changed location.
    var info = snapshot.val();
    // console.log('-----------');
    // console.log('busupdated');
    // console.log(snapshot.val());
    // console.log('-----------');

    // Retrieve latitude/longitude with info.lat/info.lon.
}



// Global map variable
var map;

// Set the center as Firebase HQ
var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];

// Query radius
var radiusInKm = 0.5;





/*****************/
/*  GOOGLE MAPS  */
/*****************/
/* Initializes Google Maps */
function initializeMap() {
  // Get the location as a Google Maps latitude-longitude object
  var loc = new google.maps.LatLng(center[0], center[1]);

  // Create the Google Map
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    center: loc,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create a draggable circle centered on the map
  var circle = new google.maps.Circle({
    strokeColor: "#6D3099",
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    map: map,
    center: loc,
    radius: ((radiusInKm) * 1000),
    draggable: true
  });

  //Update the query's criteria every time the circle is dragged
  var updateCriteria = _.debounce(function() {
    var latLng = circle.getCenter();
    geoQuery.updateCriteria({
      center: [latLng.lat(), latLng.lng()],
      radius: radiusInKm
    });
  }, 10);
  google.maps.event.addListener(circle, "drag", updateCriteria);
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the inputted vehicle to the map */
function createVehicleMarker(vehicle, vehicleColor) {
  var marker = new google.maps.Marker({
    icon: "https://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + vehicleColor + "|eee",
    position: new google.maps.LatLng(vehicle.lat, vehicle.lon),
    optimized: true,
    map: map
  });

  return marker;
}

/* Returns a blue color code for outbound vehicles or a red color code for inbound vehicles */
function getVehicleColor(vehicle) {
  return ((vehicle.dirTag && vehicle.dirTag.indexOf("OB") > -1) ? "50B1FF" : "FF6450");
}

/* Returns true if the two inputted coordinates are approximately equivalent */
function coordinatesAreEquivalent(coord1, coord2) {
  return (Math.abs(coord1 - coord2) < 0.000001);
}

/* Animates the Marker class (based on https://stackoverflow.com/a/10906464) */
google.maps.Marker.prototype.animatedMoveTo = function(newLocation,vehicle) {
  var toLat = newLocation[0];
  var toLng = newLocation[1];

  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();

  // console.log('==============');
  // console.log(vehicle.id);
  // console.log(vehicle.routeTag);
  // console.log(toLat, toLng);
  // console.log(fromLat,fromLng);
  // console.log('==============');
  var result = (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng));

  // animation algorithm has no problem
  if (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng)) {

    var percent = 0;
    var latDistance = toLat - fromLat;
    var lngDistance = toLng - fromLng;
    var interval = window.setInterval(function () {

      percent += 0.01;
      var curLat = fromLat + (percent * latDistance);
      var curLng = fromLng + (percent * lngDistance);

      var pos = new google.maps.LatLng(curLat, curLng);
      this.setPosition(pos);
      if (percent >= 1) {
        window.clearInterval(interval);
      }
    }.bind(this), 50);
  }
};
