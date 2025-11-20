import polyline from '@mapbox/polyline';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const GOOGLE_API_KEY = 'AIzaSyCnLY7xzyywRT0UZbZV4fl1CoVwc5PT0Qs';

export default function HomeScreen() {

  const [currentLocation, setCurrentLocation] = useState<any>(null);


  const [destination] = useState({
    latitude: 10.7721,
    longitude: 106.6983,
  });


  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);


  const [isTracking, setIsTracking] = useState(false);

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);


  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền vị trí để sử dụng ứng dụng');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    })();
  }, []);


  const fetchDirections = async (startLoc: any, destLoc: any) => {
    try {
      const mode = 'driving';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destLoc.latitude},${destLoc.longitude}&key=${GOOGLE_API_KEY}&mode=${mode}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.routes.length > 0) {
        const points = result.routes[0].overview_polyline.points;
        const decodedCoords = polyline.decode(points).map((point) => ({
          latitude: point[0],
          longitude: point[1]
        }));
        setRouteCoordinates(decodedCoords);


        mapRef.current?.fitToCoordinates(decodedCoords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error("Lỗi lấy chỉ đường:", error);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      setIsTracking(false);
    } else {
      setIsTracking(true);
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentLocation({ latitude, longitude });

          if (destination) {
            fetchDirections({ latitude, longitude }, destination);
          }
        }
      );
    }
  };


  useEffect(() => {
    if (currentLocation && destination) {
      fetchDirections(currentLocation, destination);
    }
  }, [currentLocation]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        initialRegion={{
          latitude: 10.762622,
          longitude: 106.660172,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {destination && (
          <Marker
            coordinate={destination}
            title="Điểm giao hàng"
            pinColor="red"
          />
        )}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00B0FF"
            strokeWidth={4}
          />
        )}
      </MapView>

      <View style={styles.controlContainer}>
        <TouchableOpacity
          style={[styles.button, isTracking ? styles.btnActive : styles.btnInactive]}
          onPress={toggleTracking}
        >
          <Text style={styles.btnText}>
            {isTracking ? "Đang theo dõi: BẬT" : "Theo dõi vị trí: TẮT"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  controlContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  btnActive: { backgroundColor: '#4CAF50' },
  btnInactive: { backgroundColor: '#F44336' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});