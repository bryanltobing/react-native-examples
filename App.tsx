/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
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
} from 'react-native-vision-camera';
import {reduceRatio} from './src/helpers';
import {manipulateAsync, type ActionCrop} from 'expo-image-manipulator';

export const KTP_WIDTH = 323.52;
export const KTP_HEIGHT = 204.01;

export default function App() {
  const devices = useCameraDevices();
  const device = devices.back;
  const cameraRef = useRef<Camera | null>(null);

  const [cropData, setCropData] = useState<ActionCrop['crop']>();

  const {width: windowDimensionsWidth} = useWindowDimensions();

  const [imageUri, setImageUri] = useState('');

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

  const format = useMemo(
    () => availableRatios?.['16:9']?.[0],
    [availableRatios],
  );

  const handleTakePhoto = useCallback(async () => {
    const photo = await cameraRef.current?.takePhoto({skipMetadata: false});

    if (!photo) {
      return;
    }
    const photoTakenUri = 'file://' + photo.path;

    // Hack on ios where width and height are flipped
    const photoCapturedWidth =
      photo.width > photo.height ? photo.height : photo.width;
    const photoCapturedHeight =
      photo.width > photo.height ? photo.width : photo.height;

    setImageUri(photoTakenUri);

    if (!cropData) {
      return;
    }

    const scaleWidth = photoCapturedWidth / windowDimensionsWidth;
    const scaleHeight =
      photoCapturedHeight / (windowDimensionsWidth * (16 / 9));

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
  }, [cropData, windowDimensionsWidth]);

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
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <Text style={{marginLeft: 'auto'}}>Close</Text>
        </View>
        <View
          style={[
            styles.cameraContainer,
            {
              width: windowDimensionsWidth,
              height: windowDimensionsWidth * (16 / 9),
            },
          ]}>
          <Camera
            device={device}
            isActive
            style={StyleSheet.absoluteFill}
            orientation="portrait"
            photo
            ref={cameraRef}
            zoom={device.neutralZoom}
            format={{
              ...format,
              // hack on android
              ...Platform.select({
                android: {
                  photoWidth: format.photoHeight,
                  photoHeight: format.photoWidth,
                },
              }),
            }}
          />

          <View style={[StyleSheet.absoluteFill, styles.controlContainer]}>
            <View
              style={styles.boundingBox}
              onLayout={({nativeEvent: {layout}}) => {
                alert(JSON.stringify(layout, null, 2));
                setCropData({
                  width: layout.width,
                  height: layout.height,
                  originX: layout.x,
                  originY: layout.y,
                });
              }}
            />

            <Text style={{textAlign: 'center', color: '#ffffff'}}>
              Pastikan KTP kamu ada di dalam area kotak
            </Text>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  cameraContainer: {
    position: 'relative',
  },
  controlContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  boundingBox: {
    aspectRatio: KTP_WIDTH / KTP_HEIGHT,
    borderColor: 'white',
    borderWidth: 2,
  },
  captureButton: {
    width: 60,
    height: 60,
    backgroundColor: 'red',
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 30,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});
