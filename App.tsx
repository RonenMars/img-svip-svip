import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  CameraRoll,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const SVIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

type Photo = PhotoIdentifier;

function PhotoCard({
  photo,
  onSvipeLeft,
  onSvipeRight,
  isTop,
}: {
  photo: Photo;
  onSvipeLeft: () => void;
  onSvipeRight: () => void;
  isTop: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSvipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        onSvipeLeft();
      } else {
        onSvipeRight();
      }
    },
    [onSvipeLeft, onSvipeRight],
  );

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate(event => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(event => {
      if (Math.abs(event.translationX) > SVIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(targetX, {duration: 300}, () => {
          runOnJS(handleSvipeComplete)(direction);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
    );

    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {rotate: `${rotate}deg`},
      ],
    };
  });

  const keepOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SVIPE_THRESHOLD],
      [0, 1],
    );
    return {opacity: Math.max(0, opacity)};
  });

  const deleteOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SVIPE_THRESHOLD, 0],
      [1, 0],
    );
    return {opacity: Math.max(0, opacity)};
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Image
          source={{uri: photo.node.image.uri}}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <Animated.View style={[styles.overlay, styles.keepOverlay, keepOverlayStyle]}>
          <Text style={styles.keepText}>{'\u2705'}</Text>
        </Animated.View>
        <Animated.View style={[styles.overlay, styles.deleteOverlay, deleteOverlayStyle]}>
          <Text style={styles.deleteText}>{'\u274C'}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function PhotoSviper() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stats, setStats] = useState({kept: 0, deleted: 0});

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const result = await CameraRoll.getPhotos({
        first: 100,
        assetType: 'Photos',
      });
      setPhotos(result.edges);
      setHasPermission(true);
    } catch (error: unknown) {
      console.error('Error loading photos:', error);
      if (error instanceof Error && error.message.includes('denied')) {
        setHasPermission(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleSvipeRight = useCallback(async () => {
    setStats(prev => ({...prev, kept: prev.kept + 1}));
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSvipeLeft = useCallback(async () => {
    const photoToDelete = photos[currentIndex];

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Reset card position would require ref - for now just move on
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CameraRoll.deletePhotos([photoToDelete.node.image.uri]);
              setStats(prev => ({...prev, deleted: prev.deleted + 1}));
              setCurrentIndex(prev => prev + 1);
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            }
          },
        },
      ],
    );
  }, [currentIndex, photos]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Loading photos...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>
          Photo library access denied.{'\n'}
          Please enable it in Settings.
        </Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>No photos found</Text>
      </View>
    );
  }

  if (currentIndex >= photos.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.doneTitle}>All Done!</Text>
        <Text style={styles.statsText}>Kept: {stats.kept}</Text>
        <Text style={styles.statsText}>Deleted: {stats.deleted}</Text>
      </View>
    );
  }

  const visiblePhotos = photos.slice(currentIndex, currentIndex + 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {currentIndex + 1} / {photos.length}
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {visiblePhotos.reverse().map((photo, index) => (
          <PhotoCard
            key={photo.node.image.uri}
            photo={photo}
            isTop={index === visiblePhotos.length - 1}
            onSvipeLeft={handleSvipeLeft}
            onSvipeRight={handleSvipeRight}
          />
        ))}
      </View>

      <View style={styles.instructions}>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionEmoji}>&#x274C;</Text>
          <Text style={styles.instructionText}>Svipe left to delete</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionEmoji}>&#x2705;</Text>
          <Text style={styles.instructionText}>Svipe right to keep</Text>
        </View>
      </View>
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.flex}>
          <StatusBar barStyle="dark-content" />
          <PhotoSviper />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 50,
  },
  keepOverlay: {
    right: 30,
  },
  deleteOverlay: {
    left: 30,
  },
  keepText: {
    fontSize: 64,
  },
  deleteText: {
    fontSize: 64,
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 40 : 20,
  },
  instructionItem: {
    alignItems: 'center',
  },
  instructionEmoji: {
    fontSize: 32,
  },
  instructionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  messageText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  doneTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statsText: {
    fontSize: 20,
    color: '#666',
    marginVertical: 5,
  },
});

export default App;
