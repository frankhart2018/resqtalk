const currentLocation = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    resolve(`Latitude: ${latitude}, Longitude: ${longitude}`);
                },
                (error) => {
                    reject(`Error getting location: ${error.message}`);
                }
            );
        } else {
            reject("Geolocation is not supported by this browser.");
        }
    });
};

export const LOCATION_RESULT = {
    result: ""
}

export const getLocation = () => {
    currentLocation().then((locationString: string) => {
        LOCATION_RESULT.result = locationString;
    }).catch((error) => {
        console.error(error);
        LOCATION_RESULT.result = "";
    });
}