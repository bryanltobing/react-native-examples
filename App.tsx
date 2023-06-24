import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  useCameraDevices,
  Camera,
  sortFormats,
  type CameraDeviceFormat,
  useCameraFormat,
} from 'react-native-vision-camera';
import {reduceRatio} from './src/helpers';
import {manipulateAsync, type ActionCrop} from 'expo-image-manipulator';

export const KTP_WIDTH = 323.52;
export const KTP_HEIGHT = 204.01;

export default function App() {
  const devices = useCameraDevices();
  const device = devices.back;
  const cameraRef = useRef<Camera | null>(null);
  const boundingBoxRef = useRef<View | null>(null);

  const [cropData, setCropData] = useState<ActionCrop['crop']>();

  const {width, height} = useWindowDimensions();

  // alert(JSON.stringify({width: Dimensions.get('window').width, height: Dimensions.get("window").height}, null, 2));

  const [imageUri, setImageUri] = useState('');
  // useEffect(() => {
  //   if (imageUri) {
  //     Image.getSize(imageUri, (width, height) => {
  //       alert(JSON.stringify({width, height}, null, 2));
  //     });
  //   }
  // }, [imageUri]);

  const availableRatios = useMemo(
    () =>
      device?.formats.reduce<Record<string, CameraDeviceFormat[]>>(
        (acc, format) => {
          const ratio = reduceRatio(format.photoWidth, format.photoHeight);

          return {
            ...acc,
            // use 'sortFormats' from 'react-native-vision-camera' to get the best resolutions first
            [ratio]: [...(acc[ratio] || []), format].sort(sortFormats),
          };
        },
        {},
      ),
    [device?.formats],
  );

  const cameraFormat = useCameraFormat(device);

  const format = useMemo(
    () => availableRatios?.['4:3']?.[0],
    [availableRatios],
  );

  const handleTakePhoto = useCallback(async () => {
    const photo = await cameraRef.current?.takePhoto({skipMetadata: false});

    if (!photo) return;
    const photoTakenUri = 'file://' + photo.path;

    // hack on ios for flipped width and height
    const photoCapturedWidth =
      photo.width > photo.height ? photo.height : photo.width;
    const photoCapturedHeight =
      photo.width > photo.height ? photo.width : photo.height;

    setImageUri(photoTakenUri);
    // alert(
    //   JSON.stringify(
    //     {WIDTH: photoCapturedWidth, height: photoCapturedHeight},
    //     null,
    //     2,
    //   ),
    // );

    if (!cropData) {
      return;
    }

    const scaleWidth = photoCapturedWidth / width;
    const scaleHeight = photoCapturedHeight / (width * (4 / 3));

    const manipulated = await manipulateAsync(photoTakenUri, [
      {
        crop: {
          width: cropData.width * scaleWidth,
          height: cropData.height * scaleHeight,
          originX: cropData.originX * scaleWidth,
          originY: cropData.originY * scaleHeight,
        },
      },
    ]);

    setImageUri(manipulated.uri);
  }, [cropData, width]);

  if (imageUri) {
    return (
      <TouchableOpacity onPress={() => setImageUri('')}>
        <Image
          source={{uri: imageUri}}
          style={{width: '100%', height: '100%'}}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  if (device == null) {
    return <ActivityIndicator />;
  }

  if (!format) {
    return false;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={[StyleSheet.absoluteFill, {width, height: width * (4 / 3)}]}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo
        zoom={device.neutralZoom}
        format={{
          ...format,
          // hack on android
          ...Platform.select({
            android: {
              photoWidth: format.photoHeight,
              photoHeight: format.photoWidth,
            },
            // ios: {
            //   photoWidth: format.photoHeight,
            //   photoHeight: format.photoWidth,
            // },
          }),
        }}
      />
      <View style={[StyleSheet.absoluteFill]}>
        <View style={styles.controlContainer}>
          <View
            style={styles.boundingBox}
            ref={boundingBoxRef}
            onLayout={() => {
              boundingBoxRef.current?.measure(
                (x, y, width, height, pageX, pageY) => {
                  setCropData({height, width, originX: pageX, originY: pageY});
                },
              );
            }}
          />
          {/* <ScrollView>
            <Text style={{color: 'white'}}>
              {JSON.stringify(format, null, 2)}
            </Text>
          </ScrollView> */}

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}>
            <Text style={{color: 'white'}}>Capture</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  controlContainer: {
    // flex: 1,
    justifyContent: 'space-between',
  },
  boundingBox: {
    // width: KTP_WIDTH,
    // height: KTP_HEIGHT,
    aspectRatio: KTP_WIDTH / KTP_HEIGHT,
    borderColor: 'white',
    borderWidth: 2,
    marginHorizontal: 16,
  },
  captureButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
