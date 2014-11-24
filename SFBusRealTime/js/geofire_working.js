var map;
var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations.FirebaseHQ;
var radiusInKm = 1.0;

var transitFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com");
var transitHack = new Firebase("https://transithack.firebaseio.com/");
var geoFire = new GeoFire(transitHack.child("_geofire")); // <--------------------might be tricky

var lineIndex = transitFirebaseRef.child('sf-muni').child('vehicles');


var vehiclesInQuery = {};
var geoQuery = geoFire.query({
  center: center,
  radius: radiusInKm
});

lineIndex.on('child_added', function(snapshot) {
  console.log('-----------');
  console.log('child_added');
  console.log(snapshot.key(), snapshot.val());
  console.log('-----------');
  // update geofire
  var key = snapshot.key();
  var vehicle = snapshot.val();
  var loc = [vehicle.lat, vehicle.lon];
  vehiclesInQuery[key] = vehicle;

  geoFire.set(key, loc).then(function(){
    console.log('key added!');
  });
});

lineIndex.on('child_changed', function(snapshot) {
  console.log('-----------');
  console.log('child_changed');
  console.log(snapshot.key(), snapshot.val());
  console.log('-----------');
  var key = snapshot.key();
  var routeObj = snapshot.val();
  var loc = [routeObj.lat, routeObj.lon];

  var vehicle = vehiclesInQuery[key];
  console.log(vehicle);
  if (typeof vehicle !== "undefined" && typeof vehicle.marker !== "undefined") {
    console.log(vehicle);
    vehicle.marker.animatedMoveTo(loc);
  }


  geoFire.set(key, loc).then(function(){
    console.log('key updated!');
  });



});

lineIndex.on('child_removed', function(snapshot) {
  console.log('-----------');
  console.log('child_removed');
  console.log(snapshot.key(), snapshot.val());
  console.log('-----------');
  var key = snapshot.key();
  geoFire.remove(key).then(function(){
    console.log('key removed!');
  });
});




geoQuery.on("ready", function() {
  // console.log('---------');
  // console.log('ready');
  // console.log('---------');
});

geoQuery.on("key_entered", function(vehicleId, vehicleLocation) {
  console.log('---------');
  console.log('key enter');
  console.log('---------');
  var vehicle = vehiclesInQuery[vehicleId];
  if(vehicle){
      vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
      vehiclesInQuery[vehicleId] = vehicle;
  }
});

geoQuery.on("key_moved", function(vehicleId, vehicleLocation) {
  // console.log('---------');
  // console.log('key moved');
  // console.log('---------');
  //
});

geoQuery.on("key_exited", function(vehicleId, vehicleLocation) {
  console.log('---------');
  console.log('key excited');
  console.log('---------');
  // update the array
  var vehicle = vehiclesInQuery[vehicleId];
  // If the vehicle's data has already been loaded from the Open Data Set, remove its marker from the map
  if (vehicle) {
    vehicle.marker.setMap(null);
  }
  // Remove the vehicle from the list of vehicles in the query
  delete vehiclesInQuery[vehicleId];


});







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
google.maps.Marker.prototype.animatedMoveTo = function(newLocation) {

  console.log(this.getPosition().lat(), this.getPosition().lng());
  console.log(newLocation);
  var toLat = newLocation[0];
  var toLng = newLocation[1];

  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();

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
