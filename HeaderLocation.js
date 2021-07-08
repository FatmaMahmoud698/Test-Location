import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity, Image, Dimensions, FlatList, TextInput, KeyboardAvoidingView, Keyboard } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import RightArrow2 from '../assets/icons/rightArrow2'
import * as Location from 'expo-location';
import Add2 from '../assets/icons/add2'
import * as Permissions from 'expo-permissions';
// import Geocoder from 'react-native-geocoder';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import AsyncStorage from '@react-native-async-storage/async-storage';
import configData from "../config";
// Geocoder.apiKey = configData.GOOGLE_API;
import Geocoder from 'react-native-geocoding';
// import { SearchLocation } from '../components/searchLocation'
import { CurrentLocationButton } from '../components/CurrentLocationButton'
import Toast from 'react-native-root-toast';
import { SubmitLocation } from '../components/submitLocation'
import { Modal, SlideAnimation } from 'react-native-modals';
const { height, width } = Dimensions.get("screen");
const widthRate = width / 414;
const heightRate = height / 896;
export default function HeaderLocation(props) {
    const [mapModal, setMapModal] = useState(false)
    const [userLocation, setUserLocation] = useState(null)
    const [changelocation, setChangeLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [checkText, setCheckText] = useState('Waiting..');
    const [currentRegion, setCurrentRegion] = useState(null);
    const [choosenRegion, setChoosenRegion] = useState({ latitude: 0, longitude: 0 });
    const [currentAddress, setCurrentAddress] = useState('');
    const storeLocation = async (value) => {
        try {
            const jsonValue = JSON.stringify(value)
            await AsyncStorage.setItem('@location', jsonValue)
        } catch (e) {
            console.log(e)
        }
    }
    const getLocation = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('@location')
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.log(e)
        }
    }
    const getSavedLocation = async (type) => {
        let token = await getToken()
        if (token) {
            fetchUserAddress(type)
        } else {
            let location = await getLocation()
            if (location) {
                await getAddress(location.latitude, location.longitude, 'userAddress')
            }
        }

    };
    const setCurrentLocation = async () => {
        try{
        let { status } = await Permissions.askAsync(Permissions.LOCATION);
        if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
            Alert.alert('Permission to access location was denied')
            return;
        }
        let location = await Location.getCurrentPositionAsync({ enabledHighAcurracy: true });
        setChangeLocation(location);
        setCurrentRegion({
            latitudeDelta: 0.0043,
            longitudeDelta: 0.0034,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            altitudeAccuracy: location.coords.altitudeAccuracy,
            latitude: location.coords.latitude,
            speed: location.coords.speed,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy
        })
        if (errorMsg) {
            setCheckText(errorMsg);
        } else if (changelocation) {

            setCheckText(JSON.stringify(changelocation));
        }
    }catch(err) {
        console.log(err)
      } 
      
    };
    const fetchUserAddress = async (type) => {
        let token = await getToken()
        if (token) {
            await fetch(`${configData.SERVER_URL}api/location/getByUserId`,
                { headers: { "x-access-token": token } })
                .then(async (res) => await res.json())
                .then(async (result) => {
                    if (result.apiStatus) {
                        if (result.data) {
                            if (result.data.latitude != null && result.data.longitude != null) {
                                await getAddress(result.data.latitude, result.data.longitude, 'userAddress')
                                if (type == 'map'){
                                    goToLocation(parseFloat(result.data.latitude), parseFloat(result.data.longitude))
                                }
                            } 
                        }
                    } else {
                        Alert.alert(`${result.message}`)
                    }
                }).catch(error => console.log(error));

        } else {
            let location = await getLocation()
            if (location) {
                await getAddress(location.latitude, location.longitude, 'userAddress')
            }
        }
    }
    const goToLocation = async (latitude, longitude) => {
        let latitudeDelta = 0.0043
        let longitudeDelta = 0.0034
        Location.map.animateToRegion({
            latitude, longitude, latitudeDelta, longitudeDelta
        })
    }
    const showModal = () => {
        if(userLocation)
        getSavedLocation('map')
        else
        setCurrentLocation()
        showMapModal()
    }
    const getAddress = async (lat, lng, type) => {
        await Geocoder.init(configData.GOOGLE_API, { language: "en" });
        await Geocoder.from(lat, lng)
            .then(async (json) => {
                let addressComponent = await json.results[0].formatted_address
                if (type == 'new') {
                    setCurrentAddress(addressComponent)
                    Toast.show(JSON.stringify(addressComponent), {
                        duration: Toast.durations.SHORT,
                        position: Toast.positions.BOTTOM,
                        shadow: true,
                        animation: true,
                        hideOnPress: true,
                        delay: 0,
                        backgroundColor:"rgb(236, 236, 236)",
                        textColor:'#333'
                    });
                } else {
                    await setUserLocation(addressComponent.split(","))
                }
            })
            .catch(error => console.log(error));
    }
    const getToken = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('@token')
            return jsonValue != null ? jsonValue : null;
        } catch (e) {
            console.log(e.message)
        }
    }
    const editRegion = async (region) => {
        setChoosenRegion(region)
    }
    const showAddress = async () => {
        await getAddress(choosenRegion.latitude, choosenRegion.longitude, 'new')
    }
    const showMapModal = async () => {
        setMapModal(true)
    }
    const centerMap = async () => {
        await setCurrentLocation()
        if (currentRegion) {
            const { latitude, longitude, latitudeDelta, longitudeDelta } = currentRegion
            Location.map.animateToRegion({
                latitude, longitude, latitudeDelta, longitudeDelta
            })
        }
    }
    const handleAddLocation = async () => {
        let token = await getToken()
        if (token) {
            try {
                await fetch(`${configData.SERVER_URL}api/location/addUserLocation`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json", "x-access-token": token },
                    body: JSON.stringify({
                        latitude: choosenRegion.latitude,
                        longitude: choosenRegion.longitude,
                    })
                }).then(async (res) => await res.json())
                    .then(async (data) => {
                        if (data.apiStatus) {
                            setMapModal(false)
                            await fetchUserAddress('refresh')
                            await storeLocation({
                                latitude: choosenRegion.latitude,
                                longitude: choosenRegion.longitude,
                            })
                            Alert.alert(`Location is added successfully`)
                        } else {
                            Alert.alert(`${data.message}`)
                        }
                    })
            } catch (error) {
                console.log(error)
            }
        } else {
            await storeLocation({
                latitude: choosenRegion.latitude,
                longitude: choosenRegion.longitude,
            })
            await getAddress(choosenRegion.latitude, choosenRegion.longitude, 'userAddress')
            Alert.alert(`Location is added successfully`)
        }
    }
    const [keyboardStatus, setKeyboardStatus] = useState(false)
    const editRegionAfterSearch = async (details) => {
        let latitude = await details.geometry.location.lat
        let longitude = await details.geometry.location.lng
        let latitudeDelta = 0.0043
        let longitudeDelta = 0.0034
        setChoosenRegion({ latitude, longitude, latitudeDelta, longitudeDelta })
        Location.map.animateToRegion({
            latitude, longitude, latitudeDelta, longitudeDelta
        })
    }
    const _keyboardDidHide = () => {
        setKeyboardStatus(false)
    };
    const _keyboardDidShow = () => {
        setKeyboardStatus(true)
    };
    useEffect(() => {
        getSavedLocation('refresh')
        // fetchUserAddress()
        Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
        Keyboard.addListener('keyboardDidHide', _keyboardDidHide);
        return () => {
            Keyboard.removeListener('keyboardDidShow', _keyboardDidShow);
            Keyboard.removeListener('keyboardDidHide', _keyboardDidHide);
        };
    }, [props.refresh])
    return (
        <View style={[styles.storeViewContainerLocation,props.style]}>
            <TouchableOpacity style={{height:'100%',justifyContent:'center'}} onPress={() => showModal()} >
                <View style={styles.storeViewLocationDown}>
                    <Text style={[styles.storeViewLocationDownText,props.fontStyle]} numberOfLines={1}>{userLocation ?
                        `${userLocation[0]} - ${userLocation[1]}`
                        : `select your location...`}</Text>
                    <RightArrow2 width={11.24 * widthRate} height={11.24 * heightRate} />
                </View>
            </TouchableOpacity>
            {mapModal ? (
                <View>
                    <Modal
                        visible={mapModal}
                        modalAnimation={new SlideAnimation({
                            slideFrom: 'bottom',
                        })}
                        onTouchOutside={() =>
                            setMapModal(false)
                        }
                        loadingEnabled={true}
                        transparent={true}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.69)' }}
                    >
                        <View style={[styles.modalContainer]}>
                            <View style={{ flex: 1 }}>
                                {/* <SearchLocation /> */}
                                <View style={[styles.searchLocationContainer, { top: keyboardStatus ? 50 : 20 }]}>
                                    <GooglePlacesAutocomplete
                                        placeholder="Search..."
                                        minLength={2}
                                        fetchDetails={true}
                                        isFocused
                                        query={{
                                            key: `${configData.GOOGLE_API}`,
                                            language: 'en', // language of the results
                                            components: 'country:eg',
                                        }}
                                        onPress={async (data, details = null) => {
                                            editRegionAfterSearch(details)
                                        }
                                        }
                                        onFail={(error) => console.error(error)}
                                        enablePoweredByContainer={false}
                                    />
                                </View>

                                <CurrentLocationButton cb={() => centerMap()} top={'87%'} left={'80%'} />
                                <SubmitLocation cb={() => handleAddLocation()} top={'87%'} left={'35%'} width={100 * widthRate} />
                                <MapView
                                    style={styles.map}
                                    loadingEnabled={true}
                                    initialRegion={currentRegion}
                                    onRegionChangeComplete={(region) => editRegion(region)}
                                    // onRegionChange={(region) => editRegion(region)}
                                    showsCompass={true}
                                    rotateEnabled={false}
                                    showsUserLocation={true}
                                    ref={(map => { Location.map = map })}
                                >
                                    {/* <Marker
                                    key={'2'}
                                    coordinate={{
                                        latitude: choosenRegion.latitude,
                                        longitude: choosenRegion.longitude,
                                        latitudeDelta: 0.0043,
                                        longitudeDelta: 0.0034,
                                    }}
                                    image={require('../assets/mapMarker.png')}
                                    title="This is a title"
                                    description="This is a description"
                                    onPress={()=>console.log('pressed Location')}
                                >
                                </Marker> */}

                                </MapView>
                                <TouchableOpacity style={{ top: '50%', left: '50%', marginLeft: -11, position: 'absolute', marginTop: -45 }} onPress={() => showAddress()}>
                                    <Image style={{ height: 45, width: 20, }} source={require('../assets/location.png')} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </View>
            ) : null}
        </View>

    );
}

const styles = StyleSheet.create({
    storeViewContainerLocation: {
        width: '70%',
        marginTop: 25 * heightRate,
        alignSelf: 'center',
        borderRadius: 11 * widthRate,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        // zIndex: 6,
        shadowRadius: 11,
        shadowColor: 'rgba(0, 0, 0, 0.4)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        elevation: 5,
        height: 29 * heightRate,
        alignItems: 'center',
        justifyContent: 'center'
    },
    storeViewLocationTop: {
        alignSelf: 'center',
        padding: 5 * heightRate,
    },
    storeViewLocationTopText: {
        // fontWeight: '400',
        fontFamily: "proximaNovaRegular",
        fontStyle: 'normal',
        fontSize: 11.46 * widthRate,
        // lineHeight: 14.9 * heightRate,
        color: 'rgba(85, 85, 85, 1)',
        letterSpacing: -0.01,
    },
    storeViewLocationDown: {
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30 * widthRate,
        // backgroundColor:'red',
        // padding: 10

    },
    storeViewLocationDownText: {
        flex: 1,
        fontFamily: "proximaNovaBold",
        fontStyle: 'normal',
        fontSize: 10.74 * widthRate,
        color: 'rgba(0, 0, 0, 1)',
    },
    storeViewLocationDownImage: {
        width: 11.24 * widthRate,
        height: 11.24 * heightRate,
    },
    modalContainer: {
        backgroundColor: 'rgba(237, 237, 237, 1)',
        width: 370 * widthRate,
        height: 500 * heightRate,
        borderRadius: 3,
        opacity: 1,
    },
    modelTitle: {
        alignSelf: 'center',
    },
    modalElementItem: {
        alignSelf: 'center',
        width: 0.9 * 370 * widthRate,
        height: 40 * heightRate,
        borderRadius: 10 * widthRate,
        borderColor: '#000000',
        borderWidth: 2,
        marginVertical: 2,
        alignItems: 'center'
    },
    modalElementItemTouch: {
        width: 0.9 * 370 * widthRate,
        height: 200,
        alignItems: 'center'
    },
    modalElementItemAdd: {
        // alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',

    },
    map: {
        flex: 1,
        // height: 0.5 * height
    },
    modalViewSearch: {
        width: 0.9 * 370 * widthRate,
        alignSelf: 'center',
        alignItems: 'center',
        padding: 5,
        margin: 5,
    },
    searchLocationContainer: {
        zIndex: 9,
        position: 'absolute',
        flexDirection: 'row',
        width: width * 0.8,
        // height:60,
        alignSelf: 'center',
        borderRadius: 4,
        backgroundColor: 'white',
        alignItems: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.4)',
        elevation: 7,
        shadowRadius: 5,
        shadowOpacity: 1.0
    }
});
