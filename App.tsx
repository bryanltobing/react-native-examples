import React, {useCallback, useMemo, useRef} from 'react';
import {
  ActivityIndicator,
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

export default function App() {
  const devices = useCameraDevices();
  const device = devices.back;
  const cameraRef = useRef<Camera | null>(null);

  const {width} = useWindowDimensions();

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
    () => availableRatios?.['16:9']?.[0],
    [availableRatios],
  );

  const handleTakePhoto = useCallback(async () => {
    const photo = await cameraRef.current?.takePhoto({skipMetadata: false});
    alert(JSON.stringify(photo, null, 2));
  }, []);

  if (device == null) {
    return <ActivityIndicator />;
  }

  if (!format) {
    return false;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={[StyleSheet.absoluteFill, {width, height: width * (16 / 9)}]}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo
        format={{
          ...format,
          // hack on android TODO: need to make sure on ios
          photoWidth: format.photoHeight,
          photoHeight: format.photoWidth,
        }}
      />
      <View style={[StyleSheet.absoluteFill]}>
        <View style={styles.controlContainer}>
          <View style={styles.boundingBox} />
          <ScrollView>
            <Text style={{color: 'white'}}>
              {JSON.stringify(format, null, 2)}
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}>
            <Text>Capture</Text>
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
    flex: 1,
    justifyContent: 'space-between',
  },
  boundingBox: {
    width: 323.52,
    height: 204.01,
    borderColor: 'white',
    borderWidth: 2,
  },
  captureButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
