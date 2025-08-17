import React, { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ;p imports (these should be at the very top of your file, they are correct)
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged, // For registration
  signInWithEmailAndPassword, // For email/password login
  signOut, // To allow switching users or logging out
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
} from "firebase/firestore"; // deleteDoc added

function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false); // New state for dark mode

  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null); // New state for user email
  const [isFirebaseReady, setIsFirebaseReady] = useState(false); // Indicates if Firebase app and services are initialized

  // App states
  const [foodDescription, setFoodDescription] = useState("");
  const [foodImage, setFoodImage] = useState(null);
  const [foodImagePreview, setFoodImagePreview] = useState("");
  const [nutritionalInfo, setNutritionalInfo] = useState(null); // State to hold the latest nutritional info result
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    fats: 0,
    sugars: 0,
  });
  const [foodEntries, setFoodEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mealType, setMealType] = useState("Breakfast");
  const [selectedTab, setSelectedTab] = useState("aboutMe");
  const [dailyDisplayMode, setDailyDisplayMode] = useState("numbers");
  const [weeklyDisplayMode, setWeeklyDisplayMode] = useState("numbers");

  // States for "About me"
  const [weight, setWeight] = useState(0); // in kg - Initialized to 0
  const [height, setHeight] = useState(0); // in cm - Initialized to 0
  const [dob, setDob] = useState(""); // YYYY-MM-DD format
  const [gender, setGender] = useState(""); // New state for gender
  const [bmi, setBmi] = useState(null);
  const [age, setAge] = useState(null);

  // States for "Target" tab
  const [targetOption, setTargetOption] = useState("weightLoss");
  const [targetWeight, setTargetWeight] = useState(0); // Initialized to 0
  const [targetDate, setTargetDate] = useState("");
  const [monthlyWeightChange, setMonthlyWeightChange] = useState(null);
  const [suggestedWeightRange, setSuggestedWeightRange] = useState({}); // Initialized to empty object
  const [suggestingWeight, setSuggestingWeight] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");

  // New states for AI recommended daily nutritional targets (for both loss and maintenance)
  const [recommendedDailyTargets, setRecommendedDailyTargets] = useState({}); // Initialized to empty object
  const [calculatingTargets, setCalculatingTargets] = useState(false);
  const [targetCalculationError, setTargetCalculationError] = useState("");

  // New state for Maintenance Goals
  const [maintenanceGoals, setMaintenanceGoals] = useState({});
  const [gettingMaintenanceGoals, setGettingMaintenanceGoals] = useState(false);
  const [maintenanceGoalsError, setMaintenanceGoalsError] = useState("");

  // New state for Muscle Gain Goals
  const [muscleGainGoals, setMuscleGainGoals] = useState({});
  const [gettingMuscleGainGoals, setGettingMuscleGainGoals] = useState(false);
  const [muscleGainGoalsError, setMuscleGainGoalsError] = useState("");

  // States for "Workout" tab
  const [workoutType, setWorkoutType] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState(""); // in minutes
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutDate, setWorkoutDate] = useState("");
  const [workoutEntries, setWorkoutEntries] = useState([]);
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState("");

  // States for "AI Chef" tab
  const [chefPrompt, setChefPrompt] = useState("");
  const [aiRecipe, setAiRecipe] = useState("");
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState("");

  // States for authentication (Email/Password)
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility

  // State for save status feedback
  const [saveStatusMessage, setSaveStatusMessage] = useState("");
  const saveStatusTimeoutRef = useRef(null); // Ref to clear timeout

  // States for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteItemType, setDeleteItemType] = useState(""); // 'food' or 'workout'

  // References for cleanup
  const foodEntriesUnsubscribe = useRef(null);
  const userProfileUnsubscribe = useRef(null);
  const workoutEntriesUnsubscribe = useRef(null); // New ref for workout entries

  // --- START: Firebase Configuration (PASTE YOURS HERE) ---
  // IMPORTANT: This is where you paste the firebaseConfig object ONLY.
  // The 'const app = initializeApp(firebaseConfig);' and 'const analytics = getAnalytics(app);'
  // lines should NOT be here. They are handled in the useEffect below.
  const firebaseConfig = {
    apiKey: "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M",
    authDomain: "fitness-tracker-5bc75.firebaseapp.com",
    projectId: "fitness-tracker-5bc75",
    storageBucket: "fitness-tracker-5bc75.firebasestorage.app",
    messagingSenderId: "64792173419",
    appId: "1:64792173419:web:d8d65ebfa279b4302b0a2e",
    measurementId: "G-X8ME1BZHME",
  };
  // --- END: Firebase Configuration ---

  // Default theme colors for light/dark mode and alert/chart colors
  const defaultLightColors = {
    appBg: "bg-gradient-to-br from-blue-50 to-cyan-100", // Outer background
    cardBg: "#ffffff", // Main card background
    normalText: "#1f2937", // Main text
    mediumText: "#374151", // Secondary text
    lightText: "#6b7280", // Faint text
    strongText: "#1e40af", // Strong emphasis text
    accentMain: "#3b82f6", // Main accent (blue-600)
    accentDark: "#1e40af", // Darker accent (blue-900)
    border: "#d1d5db", // General borders
    cardBorder: "#bfdbfe", // Card specific borders
    cardBgLight: "#eff6ff", // Light card backgrounds (for inner sections like BMI/Targets)

    // Fixed alert/success/danger colors (not user-customizable via picker)
    alertOrangeBg: "#fffbe6",
    alertOrangeBorder: "#f97316",
    alertOrangeText: "#ea580c",
    alertRedBg: "#fef2f2",
    alertRedBorder: "#ef4444",
    alertRedText: "#dc2626",
    alertGreenBg: "#f0fdf4",
    alertGreenText: "#22c55e",

    // Fixed button base colors
    buttonPrimaryBg: "#3b82f6",
    buttonPrimaryHover: "#2563eb",
    buttonPrimaryText: "#ffffff", // Original blue-600
    buttonSecondaryBg: "#bfdbfe",
    buttonSecondaryHover: "#93c5fd",
    buttonSecondaryText: "#1e40af", // Original blue-200, blue-800
    buttonSuccessBg: "#22c55e",
    buttonSuccessHover: "#16a34a",
    buttonSuccessText: "#ffffff",
    buttonDangerBg: "#ef4444",
    buttonDangerHover: "#dc2626",
    buttonDangerText: "#ffffff",
    buttonIndigoBg: "#6366f1",
    buttonIndigoHover: "#4f46e5",
    buttonIndigoText: "#ffffff",
  };

  const defaultDarkColors = {
    appBg: "bg-gradient-to-br from-gray-900 to-gray-700",
    cardBg: "#374151",
    normalText: "#e5e7eb",
    mediumText: "#d1d5db",
    lightText: "#9ca3af",
    strongText: "#93c5fd",
    accentMain: "#60a5fa",
    accentDark: "#3b82f6",
    border: "#4b5563",
    cardBorder: "#6b7280",
    cardBgLight: "#4b5563",

    // Fixed alert/success/danger colors
    alertOrangeBg: "#7c2d12",
    alertOrangeBorder: "#fb923c",
    alertOrangeText: "#fdb140",
    alertRedBg: "#7f1d1d",
    alertRedBorder: "#f87171",
    alertRedText: "#fca5a5",
    alertGreenBg: "#065f46",
    alertGreenText: "#a7f3d0",

    // Fixed button base colors
    buttonPrimaryBg: "#60a5fa",
    buttonPrimaryHover: "#3b82f6",
    buttonPrimaryText: "#ffffff", // Original blue-400
    buttonSecondaryBg: "#1e3a8a",
    buttonSecondaryHover: "#1d4ed8",
    buttonSecondaryText: "#93c5fd", // Darker blue, blue-200
    buttonSuccessBg: "#059669",
    buttonSuccessHover: "#047857",
    buttonSuccessText: "#ffffff",
    buttonDangerBg: "#b91c1c",
    buttonDangerHover: "#991b1b",
    buttonDangerText: "#ffffff",
    buttonIndigoBg: "#4338ca",
    buttonIndigoHover: "#3730a3",
    buttonIndigoText: "#ffffff",
  };

  // Effect to apply CSS Custom Properties
  useEffect(() => {
    const root = document.documentElement;

    // Determine the base colors (light or dark mode defaults)
    const currentTheme = isDarkMode ? defaultDarkColors : defaultLightColors;

    // Helper function to safely get color value
    const getColorValue = (colorProperty) => {
      const value = currentTheme[colorProperty];
      // Ensure value is a string before calling startsWith or replace
      if (typeof value === "string") {
        return value; // If it's already a hex code or a class name we want to use directly
      }
      return ""; // Fallback to empty string if not valid
    };

    // Apply colors from currentTheme directly
    // Use the helper to ensure values are strings before setting
    root.style.setProperty("--app-card-bg", getColorValue("cardBg"));
    root.style.setProperty("--app-accent-main", getColorValue("accentMain"));
    root.style.setProperty("--app-accent-dark", getColorValue("accentDark"));

    root.style.setProperty("--app-normal-text", getColorValue("normalText"));
    root.style.setProperty("--app-medium-text", getColorValue("mediumText"));
    root.style.setProperty("--app-light-text", getColorValue("lightText"));
    root.style.setProperty("--app-strong-text", getColorValue("strongText"));

    root.style.setProperty("--app-border-color", getColorValue("border"));
    root.style.setProperty("--app-card-border", getColorValue("cardBorder"));
    root.style.setProperty("--app-card-bg-light", getColorValue("cardBgLight"));

    root.style.setProperty(
      "--app-button-primary-bg",
      getColorValue("buttonPrimaryBg")
    );
    root.style.setProperty(
      "--app-button-primary-hover",
      getColorValue("buttonPrimaryHover")
    );
    root.style.setProperty(
      "--app-button-primary-text",
      getColorValue("buttonPrimaryText")
    );

    root.style.setProperty(
      "--app-button-secondary-bg",
      getColorValue("buttonSecondaryBg")
    );
    root.style.setProperty(
      "--app-button-secondary-text",
      getColorValue("buttonSecondaryText")
    );
    root.style.setProperty(
      "--app-button-secondary-hover",
      getColorValue("buttonSecondaryHover")
    );

    root.style.setProperty(
      "--app-button-success-bg",
      getColorValue("buttonSuccessBg")
    );
    root.style.setProperty(
      "--app-button-success-hover",
      getColorValue("buttonSuccessHover")
    );
    root.style.setProperty(
      "--app-button-danger-bg",
      getColorValue("buttonDangerBg")
    );
    root.style.setProperty(
      "--app-button-danger-hover",
      getColorValue("buttonDangerHover")
    );
    root.style.setProperty(
      "--app-button-indigo-bg",
      getColorValue("buttonIndigoBg")
    );
    root.style.setProperty(
      "--app-button-indigo-hover",
      getColorValue("buttonIndigoHover")
    );

    root.style.setProperty(
      "--app-tab-active-text",
      getColorValue("accentMain")
    );
    root.style.setProperty(
      "--app-tab-active-border",
      getColorValue("accentMain")
    );
    root.style.setProperty(
      "--app-tab-inactive-text",
      getColorValue("lightText")
    );
    root.style.setProperty(
      "--app-tab-inactive-hover",
      getColorValue("accentMain")
    );

    root.style.setProperty(
      "--app-input-focus-ring",
      (getColorValue("accentMain") || "") + "80"
    ); // Append transparency
    root.style.setProperty(
      "--app-input-focus-border",
      getColorValue("accentMain")
    );

    root.style.setProperty("--app-chart-bar-fill", getColorValue("accentMain"));

    root.style.setProperty(
      "--app-alert-orange-bg",
      getColorValue("alertOrangeBg")
    );
    root.style.setProperty(
      "--app-alert-orange-border",
      getColorValue("alertOrangeBorder")
    );
    root.style.setProperty(
      "--app-alert-orange-text",
      getColorValue("alertOrangeText")
    );
    root.style.setProperty("--app-alert-red-bg", getColorValue("alertRedBg"));
    root.style.setProperty(
      "--app-alert-red-border",
      getColorValue("alertRedBorder")
    );
    root.style.setProperty(
      "--app-alert-red-text",
      getColorValue("alertRedText")
    );
    root.style.setProperty(
      "--app-alert-green-bg",
      getColorValue("alertGreenBg")
    );
    root.style.setProperty(
      "--app-alert-green-text",
      getColorValue("alertGreenText")
    );
  }, [isDarkMode]);

  // Initialize Firebase and Auth. Runs once on mount.
  useEffect(() => {
    console.log("Firebase Init useEffect triggered."); // DEBUG LOG
    try {
      let currentFirebaseConfig = firebaseConfig;
      if (
        Object.keys(currentFirebaseConfig).length === 0 &&
        typeof firebaseConfig !== "undefined"
      ) {
        currentFirebaseConfig = JSON.parse(firebaseConfig);
      }

      if (!currentFirebaseConfig.apiKey) {
        setError(
          "Firebase configuration is missing. Data saving will not work. Please paste your config in the code."
        );
        console.error("Firebase config missing or invalid.");
        return;
      }

      const firebaseApp = initializeApp(currentFirebaseConfig);
      const authInstance = getAuth(firebaseApp);
      const firestoreInstance = getFirestore(firebaseApp);

      setDb(firestoreInstance);
      setAuth(authInstance);
      setIsFirebaseReady(true); // Firebase app and services are now initialized

      // Set up auth state listener
      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        console.log(
          "onAuthStateChanged triggered. User:",
          user ? user.uid : "null"
        ); // DEBUG LOG
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
        } else {
          // Reset userId and email on logout
          setUserId(null);
          setUserEmail(null);
          // Only reset other states if Firebase is truly ready AND a user was previously logged in
          // This prevents clearing data if user state is null on initial load before any login
          if (isFirebaseReady) {
            // Make sure Firebase services are initialized first
            // Reset app states on explicit logout
            setWeight(0);
            setHeight(0);
            setDob("");
            setGender("");
            setTargetWeight(0);
            setTargetDate("");
            setRecommendedDailyTargets({}); // Reset to empty object
            setSuggestedWeightRange({}); // Reset to empty object
            setMaintenanceGoals({}); // Reset maintenance goals on logout
            setFoodEntries([]);
            setDailyTotals({ calories: 0, protein: 0, fats: 0, sugars: 0 });
            setNutritionalInfo(null); // Clear last analysis result on logout

            // Reset theme mode to default light mode on logout
            setIsDarkMode(false);

            // Clean up old listeners to prevent memory leaks if user logs out/changes
            if (userProfileUnsubscribe.current) {
              userProfileUnsubscribe.current();
              userProfileUnsubscribe.current = null;
            }
            if (foodEntriesUnsubscribe.current) {
              foodEntriesUnsubscribe.current();
              foodEntriesUnsubscribe.current = null;
            }
            if (workoutEntriesUnsubscribe.current) {
              // New: Clear workout listener
              workoutEntriesUnsubscribe.current();
              workoutEntriesUnsubscribe.current = null;
            }
          }
        }
      });
      return () => unsubscribeAuth(); // Cleanup auth listener on unmount
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      setError(
        "Failed to initialize app. Data saving will not work. Check your Firebase config and console."
      );
      setIsFirebaseReady(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Load user profile and food entries. Runs when db or userId changes AND Firebase is ready.
  useEffect(() => {
    console.log(
      "Data Loading useEffect triggered. db:",
      !!db,
      "userId:",
      userId,
      "isFirebaseReady:",
      isFirebaseReady
    ); // DEBUG LOG

    // Ensure Firebase is ready and we have a logged-in user to fetch data for
    if (isFirebaseReady && db && userId) {
      console.log(
        "Attempting to set up Firestore listeners for userId:",
        userId
      ); // DEBUG LOG
      const appId = "default-app-id"; // Use a constant appId or replace with your actual app ID logic
      const userProfileRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/profile`,
        "userProfile"
      );
      const foodEntriesColRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/foodEntries`
      );
      const workoutEntriesColRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/workoutEntries`
      ); // New collection ref for workouts

      console.log(
        "UserProfile path:",
        `artifacts/${appId}/users/${userId}/profile/userProfile`
      ); // DEBUG LOG
      console.log(
        "FoodEntries path:",
        `artifacts/${appId}/users/${userId}/foodEntries`
      ); // DEBUG LOG
      console.log(
        "WorkoutEntries path:",
        `artifacts/${appId}/users/${userId}/workoutEntries`
      ); // DEBUG LOG

      // Set up profile listener
      userProfileUnsubscribe.current = onSnapshot(
        userProfileRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("User profile data loaded from Firestore:", data); // DEBUG LOG
            setWeight(parseFloat(data.weight) || 0);
            setHeight(parseFloat(data.height) || 0);
            setDob(data.dob || "");
            setGender(data.gender || "");
            setTargetWeight(parseFloat(data.targetWeight) || 0);
            setTargetDate(data.targetDate || "");
            // Default to {} if data is null/undefined to prevent .toFixed errors
            setRecommendedDailyTargets(
              data.recommendedDailyTargets
                ? { ...data.recommendedDailyTargets }
                : {}
            );
            setSuggestedWeightRange(
              data.suggestedWeightRange ? { ...data.suggestedWeightRange } : {}
            );
            setMaintenanceGoals(
              data.maintenanceGoals ? { ...data.maintenanceGoals } : {}
            ); // Load maintenance goals
            setMuscleGainGoals(
              data.muscleGainGoals ? { ...data.muscleGainGoals } : {}
            ); // Load muscle gain goals

            // Load dark mode state
            setIsDarkMode(data.isDarkMode || false); // Load dark mode state
          } else {
            console.log(
              "No user profile found in Firestore for userId:",
              userId,
              ". Initializing profile states to defaults for new user."
            ); // DEBUG LOG
            // If no profile exists, ensure states are cleared to default and create new doc
            // This ensures a clean slate if a new user logs in without existing profile data
            setWeight(0);
            setHeight(0);
            setDob("");
            setGender("");
            setTargetWeight(0);
            setTargetDate("");
            setRecommendedDailyTargets({}); // Set to empty object
            setSuggestedWeightRange({}); // Set to empty object
            setMaintenanceGoals({}); // Reset maintenance goals for new user
            setMuscleGainGoals({}); // Reset muscle gain goals for new user
            // Reset dark mode to default light mode
            setIsDarkMode(false);

            // Create an empty profile document only if it doesn't exist, to trigger initial save
            getDoc(userProfileRef)
              .then((docSnapshot) => {
                if (!docSnapshot.exists()) {
                  setDoc(
                    userProfileRef,
                    { initialized: true },
                    { merge: true }
                  ).catch((e) =>
                    console.error("Error creating default profile doc:", e)
                  );
                }
              })
              .catch((e) =>
                console.error(
                  "Error checking for profile existence before creating:",
                  e
                )
              );
          }
        },
        (error) => {
          console.error("Error fetching user profile:", error);
          setError("Failed to load user profile data.");
        }
      );

      // Set up food entries listener
      foodEntriesUnsubscribe.current = onSnapshot(
        query(foodEntriesColRef),
        (snapshot) => {
          let currentDayTotals = {
            calories: 0,
            protein: 0,
            fats: 0,
            sugars: 0,
          };
          const fetchedEntries = [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          snapshot.forEach((doc) => {
            const entry = doc.data();
            const entryDate = new Date(entry.timestamp);
            // Only add to daily totals if it's for today
            if (entryDate.toDateString() === today.toDateString()) {
              currentDayTotals.calories += entry.calories?.value || 0;
              currentDayTotals.protein += entry.protein?.value || 0;
              currentDayTotals.fats += entry.fats?.value || 0;
              currentDayTotals.sugars += entry.sugars?.value || 0;
            }
            fetchedEntries.push({ id: doc.id, ...entry });
          });
          console.log("Food entries loaded from Firestore:", fetchedEntries); // DEBUG LOG
          setFoodEntries(
            fetchedEntries.sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )
          );
          setDailyTotals(currentDayTotals);
        },
        (error) => {
          console.error("Error fetching food entries:", error);
          setError("Failed to load food entry data.");
        }
      );

      // Set up workout entries listener
      workoutEntriesUnsubscribe.current = onSnapshot(
        query(workoutEntriesColRef),
        (snapshot) => {
          const fetchedWorkouts = [];
          snapshot.forEach((doc) => {
            fetchedWorkouts.push({ id: doc.id, ...doc.data() });
          });
          console.log(
            "Workout entries loaded from Firestore:",
            fetchedWorkouts
          ); // DEBUG LOG
          setWorkoutEntries(
            fetchedWorkouts.sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )
          );
        },
        (error) => {
          console.error("Error fetching workout entries:", error);
          setError("Failed to load workout entry data.");
        }
      );
    } else {
      console.log(
        "Data Loading useEffect: Waiting for Firebase to be ready (isFirebaseReady:",
        isFirebaseReady,
        ") or user to be logged in (userId:",
        userId,
        ")"
      ); // DEBUG LOG
    }

    // Cleanup function for this useEffect:
    return () => {
      console.log("Data Loading useEffect cleanup."); // DEBUG LOG
      if (userProfileUnsubscribe.current) {
        userProfileUnsubscribe.current();
        userProfileUnsubscribe.current = null;
      }
      if (foodEntriesUnsubscribe.current) {
        foodEntriesUnsubscribe.current();
        foodEntriesUnsubscribe.current = null;
      }
      if (workoutEntriesUnsubscribe.current) {
        workoutEntriesUnsubscribe.current();
        workoutEntriesUnsubscribe.current = null;
      }
    };
  }, [db, userId, isFirebaseReady]); // Dependencies: re-run when db, userId, or isFirebaseReady changes

  // Save user profile data whenever relevant states change (debounced for efficiency)
  useEffect(() => {
    // Clear any existing timeout
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }

    const handler = setTimeout(() => {
      const hasProfileData =
        parseFloat(weight) > 0 ||
        parseFloat(height) > 0 || // if weight or height has non-zero value
        dob !== "" ||
        gender !== "" || // if DOB or gender is set
        (targetWeight && parseFloat(targetWeight) > 0) ||
        targetDate !== "" || // if target data is set
        Object.keys(recommendedDailyTargets || {}).length > 0 ||
        Object.keys(suggestedWeightRange || {}).length > 0 || // if AI targets are set and are not empty
        Object.keys(maintenanceGoals || {}).length > 0 || // If maintenance goals are set
        Object.keys(muscleGainGoals || {}).length > 0 || // If muscle gain goals are set
        isDarkMode; // Also save dark mode state itself

      if (db && userId && isFirebaseReady && hasProfileData) {
        const appId = "default-app-id"; // FIX: Use a constant string for appId
        const userProfileRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/profile`,
          "userProfile"
        );
        const profileData = {
          weight: parseFloat(weight) || 0, // Ensure number before saving
          height: parseFloat(height) || 0, // Ensure number before saving
          dob,
          gender,
          targetWeight: parseFloat(targetWeight) || 0, // Ensure number before saving
          targetDate,
          // Ensure recommendedDailyTargets and suggestedWeightRange are saved as objects
          recommendedDailyTargets: recommendedDailyTargets || {},
          suggestedWeightRange: suggestedWeightRange || {},
          maintenanceGoals: maintenanceGoals || {}, // Save maintenance goals
          muscleGainGoals: muscleGainGoals || {}, // Save muscle gain goals
          isDarkMode, // Save dark mode state
        };
        console.log(
          "Attempting to save user profile (debounced):",
          profileData
        ); // DEBUG LOG
        setSaveStatusMessage("Saving..."); // Show saving message

        // Implement exponential backoff for setDoc operation within debounce
        const maxRetries = 3;
        const initialDelay = 500; // Start with shorter delay for debounce

        const attemptSave = async (retriesLeft) => {
          try {
            await setDoc(userProfileRef, profileData, { merge: true });
            console.log("Profile saved successfully (debounced).");
            setSaveStatusMessage("Saved!"); // Show saved message
            if (saveStatusTimeoutRef.current)
              clearTimeout(saveStatusTimeoutRef.current);
            saveStatusTimeoutRef.current = setTimeout(
              () => setSaveStatusMessage(""),
              3000
            ); // Clear after 3 seconds
          } catch (e) {
            console.error(
              `Error saving user profile (debounced, retries left: ${retriesLeft}):`,
              e
            );
            setSaveStatusMessage("Save Failed!"); // Show save failed message
            if (saveStatusTimeoutRef.current)
              clearTimeout(saveStatusTimeoutRef.current);
            saveStatusTimeoutRef.current = setTimeout(
              () => setSaveStatusMessage(""),
              5000
            ); // Clear after 5 seconds
            if (retriesLeft > 0) {
              const delay =
                initialDelay * Math.pow(2, maxRetries - retriesLeft);
              console.log(`Retrying debounced save in ${delay}ms...`);
              setTimeout(() => attemptSave(retriesLeft - 1), delay);
            } else {
              console.error(
                "Failed to save profile after multiple debounced attempts."
              );
            }
          }
        };
        attemptSave(maxRetries); // Start retries
      } else {
        console.log(
          "Not saving profile (debounced): Conditions not met (DB/User/FirebaseReady/ProfileData). db:",
          !!db,
          "userId:",
          userId,
          "isFirebaseReady:",
          isFirebaseReady,
          "hasProfileData:",
          hasProfileData
        ); // DEBUG LOG
        setSaveStatusMessage(""); // Clear status if no conditions met for saving
      }
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler); // Cleanup on unmount or dependency change
      if (saveStatusTimeoutRef.current)
        clearTimeout(saveStatusTimeoutRef.current);
    };
  }, [
    weight,
    height,
    dob,
    gender,
    targetWeight,
    targetDate,
    recommendedDailyTargets,
    suggestedWeightRange,
    maintenanceGoals,
    muscleGainGoals,
    isDarkMode,
    db,
    userId,
    isFirebaseReady,
  ]);

  // Authentication functions
  const handleRegister = async () => {
    setAuthError("");
    setIsRegistering(true);
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthError("Registration successful! You are now logged in.");
    } catch (e) {
      setAuthError(e.message);
      console.error("Registration error:", e);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthError("Login successful!");
    } catch (e) {
      setAuthError(e.message);
      console.error("Login error:", e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setAuthError("");
    try {
      await signOut(auth);
      setAuthError("Logged out successfully.");
    } catch (e) {
      setAuthError(e.message);
      console.error("Logout error:", e);
    }
  };

  // Manual save profile function
  const handleSaveProfile = async () => {
    if (!db || !userId) {
      setError("Cannot save profile: Not logged in.");
      return;
    }
    setError("");
    const appId = "default-app-id"; // FIXED: Use a constant string for appId
    const userProfileRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/profile`,
      "userProfile"
    );
    const profileData = {
      weight: parseFloat(weight) || 0,
      height: parseFloat(height) || 0,
      dob,
      gender,
      targetWeight: parseFloat(targetWeight) || 0,
      targetDate,
      recommendedDailyTargets: recommendedDailyTargets || {},
      suggestedWeightRange: suggestedWeightRange || {},
      maintenanceGoals: maintenanceGoals || {}, // Save maintenance goals
      muscleGainGoals: muscleGainGoals || {}, // Save muscle gain goals
      isDarkMode, // Save dark mode state
    };
    console.log("Attempting to save user profile (MANUAL):", profileData); // DEBUG LOG

    setSaveStatusMessage("Saving..."); // Show saving message for manual save

    // Implement exponential backoff for setDoc operation
    const maxRetries = 3;
    const initialDelay = 1000; // 1 second

    for (let i = 0; i < maxRetries; i++) {
      try {
        await setDoc(userProfileRef, profileData, { merge: true });
        setSaveStatusMessage("Profile saved successfully!"); // Show saved message
        if (saveStatusTimeoutRef.current)
          clearTimeout(saveStatusTimeoutRef.current);
        saveStatusTimeoutRef.current = setTimeout(
          () => setSaveStatusMessage(""),
          3000
        ); // Clear after 3 seconds
        console.log("Profile saved successfully (MANUAL).");
        return; // Exit if successful
      } catch (e) {
        console.error(
          `Error saving user profile (MANUAL, attempt ${i + 1}):`,
          e
        );
        setSaveStatusMessage("Save Failed!"); // Show save failed message
        if (saveStatusTimeoutRef.current)
          clearTimeout(saveStatusTimeoutRef.current);
        saveStatusTimeoutRef.current = setTimeout(
          () => setSaveStatusMessage(""),
          5000
        ); // Clear after 5 seconds
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`Retrying save in ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
        } else {
          setError(
            "Failed to save profile after multiple attempts. Please try again."
          );
        }
      }
    }
  };

  // Function to convert image file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoodImage(file);
      setFoodImagePreview(URL.createObjectURL(file));
    } else {
      setFoodImage(null);
      setFoodImagePreview("");
    }
  };

  const analyzeFood = async () => {
    setError("");
    setLoading(true);
    setNutritionalInfo(null); // Clear previous analysis result

    if (!foodDescription && !foodImage) {
      setError("Please provide a description or an image of the food.");
      setLoading(false);
      return;
    }

    if (!db || !userId) {
      setError(
        'You must be logged in to save food entries. Please go to "About Me" tab and Register/Login.'
      );
      setLoading(false);
      return;
    }

    let chatHistory = [];
    const prompt = `Please analyze this food item. Based on the description: "${foodDescription}", and the image if provided, provide an estimate for the following nutritional values per serving in grams or calories (use calories for energy, grams for protein, fats, sugars), and include a confidence level for each estimate ("high", "medium", "low"). Provide the response in JSON format according to this schema: { "foodItem": "string", "calories": { "value": "number", "unit": "string", "confidence": "string" }, "protein": { "value": "number", "unit": "string", "confidence": "string" }, "fats": { "value": "number", "unit": "string", "confidence": "string" }, "sugars": { "value": "number", "unit": "string", "confidence": "string" } }`;

    const parts = [{ text: prompt }];
    console.log("foodImage=>",foodImage)
    if (foodImage) {
      try {
        const base64ImageData = await fileToBase64(foodImage);
        parts.push({
          inlineData: {
            mimeType: foodImage.type,
            data: base64ImageData,
          },
        });
      } catch (e) {
        console.error("Error converting image to base64:", e);
        setError(
          "Could not process your image. Please try again or use description only."
        );
        setLoading(false);
        return;
      }
    }

    chatHistory.push({ role: "user", parts: parts });

    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            foodItem: { type: "STRING" },
            calories: {
              type: "OBJECT",
              properties: {
                value: { type: "NUMBER" },
                unit: { type: "STRING" },
                confidence: { type: "STRING" },
              },
            },
            protein: {
              type: "OBJECT",
              properties: {
                value: { type: "NUMBER" },
                unit: { type: "STRING" },
                confidence: { type: "STRING" },
              },
            },
            fats: {
              type: "OBJECT",
              properties: {
                value: { type: "NUMBER" },
                unit: { type: "STRING" },
                confidence: { type: "STRING" },
              },
            },
            sugars: {
              type: "OBJECT",
              properties: {
                value: { type: "NUMBER" },
                unit: { type: "STRING" },
                confidence: { type: "STRING" },
              },
            },
          },
          required: ["foodItem", "calories", "protein", "fats", "sugars"],
          propertyOrdering: [
            "foodItem",
            "calories",
            "protein",
            "fats",
            "sugars",
          ],
        },
      },
    };

    const apiKey = "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          // Corrected access here
          const jsonText = result.candidates[0].content.parts[0].text;
          const parsedJson = JSON.parse(jsonText);
          setNutritionalInfo(parsedJson); // Set analysis result

          const appId = "default-app-id"; // FIXED: Use a constant string for appId
          await addDoc(
            collection(db, `artifacts/${appId}/users/${userId}/foodEntries`),
            {
              ...parsedJson,
              mealType,
              timestamp: new Date().toISOString(),
            }
          );

          setFoodDescription("");
          setFoodImage(null);
          setFoodImagePreview("");
          setMealType("Breakfast");
          setSelectedTab("tracking"); // <<< THIS LINE WILL ENSURE TAB SWITCH >>>
          break; // Exit loop on success
        } else {
          setError("Could not get nutritional info. Please try again.");
          break; // Exit loop on unexpected format
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const calculateWeeklyTotals = () => {
    const weeklyEntries = foodEntries;
    let weeklyCals = 0;
    let weeklyProt = 0;
    let weeklyFats = 0;
    let weeklySugars = 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    weeklyEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= oneWeekAgo) {
        weeklyCals += entry.calories?.value || 0;
        weeklyProt += entry.protein?.value || 0;
        weeklyFats += entry.fats?.value || 0;
        weeklySugars += entry.sugars?.value || 0;
      }
    });

    return {
      calories: weeklyCals,
      protein: weeklyProt,
      fats: weeklyFats,
      sugars: weeklySugars,
    };
  };

  const weeklyTotals = calculateWeeklyTotals();

  const dailyChartData = [
    { name: "Calories", value: dailyTotals.calories },
    { name: "Protein", value: dailyTotals.protein },
    { name: "Fats", value: dailyTotals.fats },
    { name: "Sugars", value: dailyTotals.sugars },
  ];

  const dailyPieChartData = [
    { name: "Protein", value: dailyTotals.protein },
    { name: "Fats", value: dailyTotals.fats },
    { name: "Sugars", value: dailyTotals.sugars },
  ];

  const weeklyChartData = [
    { name: "Calories", value: weeklyTotals.calories },
    { name: "Protein", value: weeklyTotals.protein },
    { name: "Fats", value: weeklyTotals.fats },
    { name: "Sugars", value: weeklyTotals.sugars },
  ];

  const weeklyPieChartData = [
    { name: "Protein", value: weeklyTotals.protein },
    { name: "Fats", value: weeklyTotals.fats },
    { name: "Sugars", value: weeklyTotals.sugars },
  ];

  const PIE_COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

  // Age and BMI calculation useEffect
  useEffect(() => {
    let calculatedBmi = null;
    const weightNum = parseFloat(weight) || 0;
    const heightNum = parseFloat(height) || 0;

    if (weightNum > 0 && heightNum > 0) {
      const heightInMeters = heightNum / 100;
      calculatedBmi = (weightNum / (heightInMeters * heightInMeters)).toFixed(
        2
      );
    }
    setBmi(calculatedBmi);

    let calculatedAge = null;
    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let ageDiff = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          ageDiff--;
        }
        if (ageDiff >= 0) {
          calculatedAge = ageDiff;
        }
      } else {
        console.warn("Invalid date of birth provided:", dob);
        calculatedAge = null;
      }
    }
    setAge(calculatedAge);
  }, [weight, height, dob]);

  const getBmiCategory = (bmiValue) => {
    if (bmiValue === null || isNaN(parseFloat(bmiValue))) return "";
    const bmiNum = parseFloat(bmiValue);
    if (bmiNum < 18.5) return "Underweight";
    if (bmiNum >= 18.5 && bmiNum < 24.9) return "Normal weight";
    if (bmiNum >= 25 && bmiNum < 29.9) return "Overweight";
    if (bmiNum >= 30) return "Obesity";
    return "";
  };

  const suggestHealthyWeightRange = async () => {
    setSuggestionError("");
    setSuggestingWeight(true);
    setSuggestedWeightRange({}); // Initialize as empty object

    const ageNum = parseFloat(age) || 0;
    const heightNum = parseFloat(height) || 0;

    if (
      isNaN(ageNum) ||
      ageNum <= 0 ||
      isNaN(heightNum) ||
      heightNum <= 0 ||
      !gender
    ) {
      setSuggestionError(
        'Please enter valid positive numbers for age and height, and select gender in the "About Me" tab first.'
      );
      setSuggestingWeight(false);
      return;
    }

    const prompt = `What are general healthy weight ranges (min and max) in kilograms for typical individuals with an age of ${ageNum} years, a height of ${heightNum} cm, and gender as ${gender}? Provide the response in JSON format according to this schema: { "minWeightKg": "number", "maxWeightKg": "number", "notes": "string" } Include a note explicitly stating this is general information and not personalized medical advice.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            minWeightKg: { type: "NUMBER" },
            maxWeightKg: { type: "NUMBER" },
            notes: { type: "STRING" },
          },
          required: ["minWeightKg", "maxWeightKg"],
          propertyOrdering: ["minWeightKg", "maxWeightKg", "notes"],
        },
      },
    };

    const apiKey = "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          const jsonText = result.candidates[0].content.parts[0].text;
          const parsedJson = JSON.parse(jsonText);
          setSuggestedWeightRange(parsedJson); // Set to the object received
          // Explicitly trigger a save after AI results are obtained
          handleSaveProfile();
          break;
        } else {
          setSuggestionError(
            "Could not get suggested weight range. Please try again."
          );
          setSuggestedWeightRange({}); // Ensure empty object on error
          break;
        }
      } finally {
        setSuggestingWeight(false);
      }
    }
  };

   const getDailyNutritionalTargets = async () => {
    setTargetCalculationError("");
    setCalculatingTargets(true);
    setRecommendedDailyTargets({}); // Initialize as empty object

    const currentWeightNum = parseFloat(weight) || 0;
    const targetWeightNum = parseFloat(targetWeight) || 0;
    const heightNum = parseFloat(height) || 0;
    const ageNum = parseFloat(age) || 0;

    const targetDateObj = targetDate ? new Date(targetDate) : null;
    const currentDateObj = new Date();

    console.log("getDailyNutritionalTargets - Input values for validation:"); // DEBUG LOG
    console.log("  currentWeightNum:", currentWeightNum);
    console.log("  targetWeightNum:", targetWeightNum);
    console.log("  heightNum:", heightNum);
    console.log("  ageNum:", ageNum);
    console.log("  gender:", gender);
    console.log("  targetDateObj:", targetDateObj);
    console.log("  currentDateObj:", currentDateObj);

    if (
      isNaN(currentWeightNum) ||
      currentWeightNum <= 0 ||
      isNaN(targetWeightNum) ||
      targetWeightNum <= 0 ||
      !targetDateObj ||
      isNaN(targetDateObj.getTime()) ||
      targetDateObj <= currentDateObj ||
      isNaN(heightNum) ||
      heightNum <= 0 ||
      isNaN(ageNum) ||
      ageNum <= 0 ||
      !gender
    ) {
      const validationMessage =
        "Please ensure valid positive numbers for current weight, target weight, height, and age, a future target date, and select gender.";
      setTargetCalculationError(validationMessage);
      console.log(
        "Validation failed in getDailyNutritionalTargets:",
        validationMessage
      ); // DEBUG LOG
      setCalculatingTargets(false);
      return;
    }

    const timeDiff = targetDateObj.getTime() - currentDateObj.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const monthsDiff = daysDiff / 30.44;

    const prompt = `What are typical daily intake targets for calories (kcal), protein (g), fats (g), and sugars (g) for an individual aiming to lose weight from ${currentWeightNum} kg to ${targetWeightNum} kg over a period of approximately ${monthsDiff.toFixed(
      1
    )} months, given they are ${heightNum} cm tall, ${ageNum} years old, and ${gender}? Provide the response in JSON format according to this schema: { "recommendedCalories": "number", "recommendedProtein": "number", "recommendedFats": "number", "recommendedSugars": "number", "notes": "string" } Include a note explicitly stating this is general information and not personalized medical advice. For fats and sugars, provide maximum recommended daily intake.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recommendedCalories: { type: "NUMBER" },
            recommendedProtein: { type: "NUMBER" },
            recommendedFats: { type: "NUMBER" },
            recommendedSugars: { type: "NUMBER" },
            notes: { type: "STRING" },
          },
          required: [
            "recommendedCalories",
            "recommendedProtein",
            "recommendedFats",
            "recommendedSugars",
          ],
          propertyOrdering: [
            "recommendedCalories",
            "recommendedProtein",
            "recommendedFats",
            "recommendedSugars",
            "notes",
          ],
        },
      },
    };

    const apiKey = "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (
                result.candidates &&
                result.candidates.length > 0 &&
                result.candidates[0].content &&
                result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0
            ) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const parsedJson = JSON.parse(jsonText);
                setRecommendedDailyTargets(parsedJson);
                handleSaveProfile();
                break;
            } else {
                setTargetCalculationError(
                    "Could not get nutritional targets. Please try again."
                );
                break;
            }
        } catch (e) {
            console.error(`Error calculating targets (attempt ${retryCount + 1}):`, e);
            if (retryCount < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, retryCount);
                await new Promise((res) => setTimeout(res, delay));
            } else {
                setTargetCalculationError(
                    "Failed to calculate targets after multiple attempts. Please try again."
                );
            }
        } finally {
            retryCount++;
        }
    }
    setCalculatingTargets(false);
  };

    const apiKey = "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `HTTP error! status: ${response.status}, body: ${errorBody}`
          );
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          const jsonText = result.candidates[0].content.parts[0].text;
          const parsedJson = JSON.parse(jsonText);
          setMuscleGainGoals(parsedJson);
          handleSaveProfile(); // Save the new muscle gain goals
          break;
        } else {
          setMuscleGainGoalsError(
            "Could not get muscle gain goals. Please try again."
          );
          setMuscleGainGoals({});
          break;
        }
      } finally {
        setGettingMuscleGainGoals(false);
      }
    }
  };

  // Monthly Weight Change Calculation useEffect (Improved robustness)
  useEffect(() => {
    let calculatedChange = null;
    const currentWeightVal = parseFloat(weight) || 0;
    const targetWeightVal = parseFloat(targetWeight) || 0;
    const targetDateObj = targetDate ? new Date(targetDate) : null;
    const currentDateObj = new Date();

    if (currentWeightVal <= 0 || targetWeightVal <= 0) {
      calculatedChange =
        "Please enter valid positive numbers for current and target weight.";
      setMonthlyWeightChange(calculatedChange);
      return;
    }

    if (!targetDateObj || isNaN(targetDateObj.getTime())) {
      calculatedChange = "Please select a valid future target date.";
      setMonthlyWeightChange(calculatedChange);
      return;
    }

    if (targetDateObj <= currentDateObj) {
      calculatedChange = "Target date must be in the future.";
      setMonthlyWeightChange(calculatedChange);
      return;
    }

    const weightDifference = currentWeightVal - targetWeightVal;
    const timeDiff = targetDateObj.getTime() - currentDateObj.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const monthsDiff = daysDiff / 30.44;

    if (monthsDiff <= 0 || !isFinite(monthsDiff)) {
      calculatedChange = "Timeframe is too short or invalid.";
    } else if (weightDifference > 0) {
      calculatedChange = weightDifference / monthsDiff;
    } else if (weightDifference < 0) {
      calculatedChange = "Target weight is higher than current.";
    } else {
      calculatedChange = "You're already at your target weight!";
    }

    setMonthlyWeightChange(calculatedChange);
  }, [weight, targetWeight, targetDate]);

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode); // Just toggle the mode
  };

  // Define theme classes based on isDarkMode state
  const themeClasses = {
    appBg: isDarkMode
      ? "bg-gray-800 from-gray-900 to-gray-700"
      : "bg-gradient-to-br from-blue-50 to-cyan-100",
    cardBg: isDarkMode ? "bg-gray-700" : "bg-white",
    headerText: isDarkMode ? "text-blue-400" : "text-blue-700",
    headerIcon: isDarkMode ? "text-blue-300" : "text-blue-600",
    normalText: isDarkMode ? "text-gray-200" : "text-gray-800",
    mediumText: isDarkMode ? "text-gray-300" : "text-gray-700",
    lightText: isDarkMode ? "text-gray-400" : "text-gray-500",
    strongText: isDarkMode ? "text-blue-200" : "text-blue-800",
    brandText: isDarkMode ? "text-blue-300" : "text-blue-700",
    brandDarkText: isDarkMode ? "text-blue-100" : "text-blue-900",
    border: isDarkMode ? "border-gray-600" : "border-gray-300",
    cardBorder: isDarkMode ? "border-gray-500" : "border-blue-200",
    cardBgLight: isDarkMode ? "bg-gray-600" : "bg-blue-50",
    alertBgOrange: isDarkMode ? "bg-orange-800" : "bg-orange-100",
    alertBorderOrange: isDarkMode ? "border-orange-600" : "border-orange-500",
    alertTextOrange: isDarkMode ? "text-orange-200" : "text-orange-700",
    alertBgRed: isDarkMode ? "bg-red-800" : "bg-red-100",
    alertBorderRed: isDarkMode ? "border-red-600" : "border-red-400",
    alertTextRed: isDarkMode ? "text-red-200" : "text-red-700",
    alertBgGreen: isDarkMode ? "bg-green-800" : "bg-green-100",
    alertTextGreen: isDarkMode ? "text-green-200" : "text-green-700",
    inputFocus: isDarkMode
      ? "focus:ring-blue-400 focus:border-blue-400"
      : "focus:ring-blue-500 focus:border-blue-500",
    buttonPrimary: isDarkMode
      ? "bg-blue-700 hover:bg-blue-800 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white",
    buttonSecondary: isDarkMode
      ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
      : "bg-blue-100 text-blue-700 hover:bg-blue-200",
    buttonSuccess: isDarkMode
      ? "bg-green-700 hover:bg-green-800"
      : "bg-green-600 hover:bg-green-700",
    buttonDanger: isDarkMode
      ? "bg-red-700 hover:bg-red-800"
      : "bg-red-500 hover:bg-red-600",
    buttonIndigo: isDarkMode
      ? "bg-indigo-700 hover:bg-indigo-800"
      : "bg-indigo-600 hover:bg-indigo-700",
    tabActive: isDarkMode
      ? "text-blue-400 border-b-2 border-blue-400"
      : "text-blue-700 border-b-2 border-blue-700",
    tabInactive: isDarkMode
      ? "text-gray-400 hover:text-blue-300"
      : "text-gray-500 hover:text-blue-600",
  };

  // Function to add a workout entry
  const addWorkout = async () => {
    setWorkoutError("");
    setAddingWorkout(true);
    console.log("addWorkout called. Values:", {
      workoutType,
      workoutDuration,
      workoutNotes,
      workoutDate,
      userId,
      db,
    }); // DEBUG LOG

    if (!workoutType || !workoutDuration || !workoutDate || !userId || !db) {
      setWorkoutError(
        "Please fill in workout type, duration, and date. Ensure you are logged in."
      );
      setAddingWorkout(false);
      return;
    }

    try {
      const appId = "default-app-id"; // FIXED: Use a constant string for appId
      const workoutColRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/workoutEntries`
      );

      const newWorkout = {
        workoutType,
        workoutDuration: parseFloat(workoutDuration) || 0,
        workoutNotes,
        workoutDate,
        timestamp: new Date().toISOString(),
      };
      console.log("Attempting to add workout to Firestore:", newWorkout); // DEBUG LOG
      await addDoc(workoutColRef, newWorkout);

      setWorkoutType("");
      setWorkoutDuration("");
      setWorkoutNotes("");
      setWorkoutDate("");
      setWorkoutError("");
      console.log("Workout added successfully."); // DEBUG LOG
    } catch (e) {
      console.error("Error adding workout:", e); // DEBUG LOG
      setWorkoutError(`Failed to add workout: ${e.message}`);
    } finally {
      setAddingWorkout(false);
    }
  };

  // Function to generate recipe based on user input, goals, and workouts
  const generateRecipe = async () => {
    setRecipeError("");
    setGeneratingRecipe(true);
    setAiRecipe(""); // Clear previous recipe

    if (!chefPrompt) {
      setRecipeError("Please tell the AI Chef what you are looking for!");
      setGeneratingRecipe(false);
      return;
    }

    if (!db || !userId) {
      setRecipeError("You must be logged in to use the AI Chef.");
      setGeneratingRecipe(false);
      return;
    }

    // --- Prepare context for AI ---
    let dietContext = "";
    let currentGoals = {};
    if (
      targetOption === "weightLoss" &&
      Object.keys(recommendedDailyTargets).length > 0
    ) {
      dietContext = `Your current fitness goal is **Weight Loss**. Your AI-recommended daily targets are: Calories ${recommendedDailyTargets.recommendedCalories?.toFixed(
        1
      )} kcal, Protein ${recommendedDailyTargets.recommendedProtein?.toFixed(
        1
      )} g, Fats Max ${recommendedDailyTargets.recommendedFats?.toFixed(
        1
      )} g, Sugars Max ${recommendedDailyTargets.recommendedSugars?.toFixed(
        1
      )} g.`;
      currentGoals = recommendedDailyTargets;
    } else if (
      targetOption === "weightMaintenance" &&
      Object.keys(maintenanceGoals).length > 0
    ) {
      dietContext = `Your current fitness goal is **Weight Maintenance**. Your AI-recommended daily targets are: Calories ${maintenanceGoals.recommendedCalories?.toFixed(
        1
      )} kcal, Protein ${maintenanceGoals.recommendedProtein?.toFixed(
        1
      )} g, Fats Max ${maintenanceGoals.recommendedFats?.toFixed(
        1
      )} g, Sugars Max ${maintenanceGoals.recommendedSugars?.toFixed(1)} g.`;
      currentGoals = maintenanceGoals;
    } else if (
      targetOption === "muscleGain" &&
      Object.keys(muscleGainGoals).length > 0
    ) {
      dietContext = `Your current fitness goal is **Muscle Gain**. Your AI-recommended daily targets are: Calories ${muscleGainGoals.recommendedCalories?.toFixed(
        1
      )} kcal, Protein ${muscleGainGoals.recommendedProtein?.toFixed(
        1
      )} g, Fats Max ${muscleGainGoals.recommendedFats?.toFixed(
        1
      )} g, Sugars Max ${muscleGainGoals.recommendedSugars?.toFixed(1)} g.`;
      currentGoals = muscleGainGoals;
    } else {
      dietContext = `You have not set specific AI-recommended daily nutrition targets for your fitness goals.`;
    }

    const recentWorkouts = workoutEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1); // Last 24 hours approximately
      return entryDate >= oneDayAgo;
    });

    let workoutContext = "";
    if (recentWorkouts.length > 0) {
      workoutContext = `You have logged recent workouts in the last 24 hours: ${recentWorkouts
        .map((w) => `${w.workoutType} for ${w.workoutDuration} mins`)
        .join(", ")}.`;
      workoutContext += ` Please consider this activity when suggesting the meal, ensuring it's suitable for post-workout recovery or energy needs, and avoids making the user feel heavy or fat.`;
    } else {
      workoutContext = `You have not logged any workouts in the last 24 hours.`;
    }

    const personalData = `User profile: ${gender}, ${age} years old, ${height} cm tall, ${weight} kg current weight.`;

    // --- Construct the detailed prompt for AI ---
    const prompt = `As an AI Chef, create a recipe based on the user's request, considering their personal profile, fitness goals, and recent activity.
    ${personalData}
    ${dietContext}
    ${workoutContext}
    
    User's specific request: "${chefPrompt}".
    
    Provide a detailed recipe including:
    1. A creative recipe name.
    2. A brief description of the dish.
    3. An organized list of ingredients with quantities.
    4. Clear, step-by-step instructions.
    5. A brief note on its suitability for the user's goals (e.g., "This recipe is good for muscle gain due to high protein content.").
    
    Ensure the recipe is tailored to their fitness goal (weight loss, maintenance, muscle gain) and recent workout intensity. For example, if they just had an intense workout, suggest something suitable for recovery. If they are aiming for weight loss, make it calorie-conscious. If they are focusing on muscle gain, ensure adequate protein. The meal should not make the user feel heavy or excessively fatty. Provide the response in an easy-to-read, plain text format.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // We want plain text, not JSON for the recipe output
        responseMimeType: "text/plain",
      },
    };

    const apiKey = "AIzaSyBS-Ht9jg81rG2nPhJkz2nBc29f-YuBO5M"; // API key is handled by Canvas environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let retryCount = 0;
    const maxRetries = 3;
    const initialDelay = 1000; // 1 second

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `AI Chef HTTP error! status: ${response.status}, body: ${errorBody}`
          );
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          const recipeText = result.candidates[0].content.parts[0].text;
          setAiRecipe(recipeText);
          break; // Exit loop on success
        } else {
          setRecipeError(
            "Could not generate a recipe. Please try a different prompt."
          );
          setAiRecipe("");
          break; // Exit loop on unexpected format
        }
      } catch (e) {
        console.error("AI Chef API call failed:", e);
        if (retryCount < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, retryCount);
          console.log(
            `Retrying AI Chef call in ${delay}ms... (Attempt ${retryCount + 1})`
          );
          await new Promise((res) => setTimeout(res, delay));
          retryCount++;
        } else {
          setRecipeError(
            `Failed to generate recipe after ${maxRetries} attempts. Please try again.`
          );
        }
      } finally {
        setGeneratingRecipe(false);
      }
    }
  };

  // Function to handle delete confirmation
  const handleDeleteConfirmation = (item, type) => {
    setItemToDelete(item);
    setDeleteItemType(type);
    setShowDeleteConfirmModal(true);
  };

  // Function to confirm and perform delete
  const confirmDelete = async () => {
    if (!itemToDelete || !deleteItemType || !db || !userId) {
      console.error("Cannot delete: missing item info or not logged in.");
      setShowDeleteConfirmModal(false);
      return;
    }

    const appId = "default-app-id"; // FIXED: Use a constant string for appId
    let collectionRef;

    if (deleteItemType === "food") {
      collectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/foodEntries`
      );
    } else if (deleteItemType === "workout") {
      collectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/workoutEntries`
      );
    } else {
      console.error("Invalid item type for deletion:", deleteItemType);
      setShowDeleteConfirmModal(false);
      return;
    }

    try {
      console.log(
        `Attempting to delete ${deleteItemType} item with ID: ${itemToDelete.id}`
      );
      await deleteDoc(doc(collectionRef, itemToDelete.id));
      console.log(`${deleteItemType} item deleted successfully.`);
      // No need to manually update state, onSnapshot will handle it
    } catch (e) {
      console.error(`Error deleting ${deleteItemType} item:`, e);
      setError(`Failed to delete ${deleteItemType} item. ${e.message}`);
    } finally {
      setShowDeleteConfirmModal(false);
      setItemToDelete(null);
      setDeleteItemType("");
    }
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setItemToDelete(null);
    setDeleteItemType("");
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 to-cyan-100"
      } flex items-center justify-center p-2 sm:p-4 font-sans ${
        isDarkMode ? "text-gray-200" : "text-gray-800"
      }`}
    >
      <div
        className={`${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } p-4 sm:p-8 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 hover:shadow-2xl`}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1
            className={`text-2xl sm:text-3xl font-bold text-center ${
              isDarkMode ? "text-blue-400" : "text-blue-700"
            } flex items-center justify-center gap-2 sm:gap-3`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 sm:h-8 sm:w-8 ${
                isDarkMode ? "text-blue-300" : "text-blue-600"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13m-6 0V9.333L9 12V19m0-7l-2 5m2-5.333L9 12M13 19V9.333L16 12V19m0-7l-2 5m2-5.333L16 12"
              />
            </svg>
            Fitness Tracker
          </h1>
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-200
                       ${
                         isDarkMode
                           ? "bg-blue-600 hover:bg-blue-700"
                           : "bg-white hover:bg-gray-100 border border-gray-300"
                       }`} /* Added border for light mode */
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {/* Conditional SVG fill/stroke for hollow/filled circle based on dark mode state */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill={
                isDarkMode ? "white" : "none"
              } /* Filled when dark mode (white circle on dark bg) */
              stroke={
                isDarkMode ? "none" : "currentColor"
              } /* Stroke with current text color when showing */
              strokeWidth="1.5" /* Consistent stroke width */
            >
              <circle cx="10" cy="10" r="5" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className={`mb-3 sm:mb-4 p-2 sm:p-3 ${
              isDarkMode ? "bg-red-800 text-red-200" : "bg-red-100 text-red-700"
            } border border-red-400 rounded-lg text-xs sm:text-sm text-center`}
          >
            {error}
          </div>
        )}

        {/* Save Status Message */}
        {saveStatusMessage && (
          <div
            className={`mb-3 sm:mb-4 p-2 sm:p-3 ${
              saveStatusMessage.includes("Successfully")
                ? isDarkMode
                  ? "bg-green-800 text-green-200"
                  : "bg-green-100 text-green-700"
                : saveStatusMessage.includes("Saving")
                ? isDarkMode
                  ? "bg-gray-600 text-gray-300"
                  : "bg-blue-50 text-gray-700"
                : isDarkMode
                ? "bg-red-800 text-red-200"
                : "bg-red-100 text-red-700"
            } rounded-lg text-xs sm:text-sm text-center`}
          >
            {saveStatusMessage}
          </div>
        )}

        {/* User Info Display */}
        {userId && (
          <div
            className={`mb-3 sm:mb-4 p-2 ${
              isDarkMode ? "bg-gray-600" : "bg-blue-50"
            } border ${isDarkMode ? "border-gray-500" : "border-blue-200"} ${
              isDarkMode ? "text-blue-300" : "text-blue-700"
            } rounded-lg text-xs text-center break-words`}
          >
            {userEmail ? (
              <>
                Logged in as: <span className="font-semibold">{userEmail}</span>{" "}
                (ID: {userId})
              </>
            ) : (
              <>Currently Anonymous (ID: {userId})</>
            )}
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-xs mt-1`}
            >
              Your data is saved under this account.
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          className={`flex justify-center flex-wrap sm:flex-nowrap mb-4 sm:mb-6 border-b ${
            isDarkMode ? "border-gray-600" : "border-gray-300"
          }`}
        >
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "addMeal"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSelectedTab("addMeal")}
          >
            Add Meal
          </button>
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "tracking"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => {
              setSelectedTab("tracking");
              setDailyDisplayMode("numbers");
              setWeeklyDisplayMode("numbers");
            }}
          >
            Tracking
          </button>
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "aboutMe"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSelectedTab("aboutMe")}
          >
            About Me
          </button>
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "target"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSelectedTab("target")}
          >
            Target
          </button>
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "workout"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSelectedTab("workout")}
          >
            Workout
          </button>
          <button
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm sm:text-lg font-medium rounded-t-lg sm:rounded-none ${
              selectedTab === "aiChef"
                ? isDarkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-700 border-b-2 border-blue-700"
                : isDarkMode
                ? "text-gray-400 hover:text-blue-300"
                : "text-gray-500 hover:text-blue-600"
            }`}
            onClick={() => setSelectedTab("aiChef")}
          >
            AI Chef
          </button>
        </div>

        {/* Add Meal Tab Content */}
        {selectedTab === "addMeal" && (
          <div>
            {userId ? (
              <>
                <div className="mb-4 sm:mb-6">
                  <label
                    htmlFor="mealType"
                    className={`block text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } mb-1 sm:mb-2`}
                  >
                    What kind of meal was it?
                  </label>
                  <select
                    id="mealType"
                    className={`w-full p-2 sm:p-3 ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-200 border-gray-600"
                        : "bg-white text-gray-800 border-gray-300"
                    } rounded-lg focus:ring-${
                      isDarkMode ? "blue-400" : "blue-500"
                    } focus:border-${
                      isDarkMode ? "blue-400" : "blue-500"
                    } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>

                <div className="mb-4 sm:mb-6">
                  <label
                    htmlFor="foodDescription"
                    className={`block text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } mb-1 sm:mb-2`}
                  >
                    Describe your food:
                  </label>
                  <textarea
                    id="foodDescription"
                    className={`w-full p-2 sm:p-3 ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-200 border-gray-600"
                        : "bg-white text-gray-800 border-gray-300"
                    } rounded-lg focus:ring-${
                      isDarkMode ? "blue-400" : "blue-500"
                    } focus:border-${
                      isDarkMode ? "blue-400" : "blue-500"
                    } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                    rows="3"
                    placeholder="e.g., A slice of pepperoni pizza, one medium apple, 200g grilled chicken breast with salad"
                    value={foodDescription}
                    onChange={(e) => setFoodDescription(e.target.value)}
                  ></textarea>
                </div>

                <div className="mb-4 sm:mb-6">
                  <label
                    htmlFor="foodImage"
                    className={`block text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } mb-1 sm:mb-2`}
                  >
                    Or upload a photo:
                  </label>
                  <input
                    id="foodImage"
                    type="file"
                    accept="image/*"
                    className={`w-full ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } text-sm sm:text-base 
                                file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 
                                file:text-sm file:font-semibold 
                                ${
                                  isDarkMode
                                    ? "file:bg-blue-700 file:text-white file:hover:bg-blue-800"
                                    : "file:bg-blue-600 file:text-white file:hover:bg-blue-700"
                                } 
                                file:shadow-md file:transition-all file:duration-200 file:transform file:hover:scale-105 
                                cursor-pointer`}
                    onChange={handleImageChange}
                  />
                  {foodImagePreview && (
                    <div className="mt-3 sm:mt-4 flex justify-center">
                      <img
                        src={foodImagePreview}
                        alt="Food preview"
                        className={`max-w-full h-auto max-h-40 sm:max-h-48 rounded-lg shadow-md ${
                          isDarkMode ? "border-gray-600" : "border-gray-300"
                        } object-cover`}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={analyzeFood}
                  className={`w-full ${
                    isDarkMode
                      ? "bg-blue-700 hover:bg-blue-800"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                    isDarkMode ? "focus:ring-blue-400" : "focus:ring-blue-500"
                  } focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base`}
                  disabled={loading || !isFirebaseReady || !userId}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Get Nutritional Info
                    </>
                  )}
                </button>
              </>
            ) : (
              <div
                className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4`}
                role="alert"
              >
                <p className="font-bold text-sm sm:text-base">Login Required</p>
                <p className="text-xs sm:text-sm">
                  Please go to the "About Me" tab to register or log in to add
                  and track your meals.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tracking Tab Content */}
        {selectedTab === "tracking" && (
          <div className="mt-4">
            {userId ? (
              <>
                {/* Moved Nutritional Info Display here */}
                {nutritionalInfo && (
                  <div
                    className={`mb-4 sm:mb-6 p-3 sm:p-4 ${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } rounded-lg ${
                      isDarkMode ? "border-gray-500" : "border-blue-200"
                    } shadow-inner`}
                  >
                    <h2
                      className={`text-lg sm:text-xl font-semibold ${
                        isDarkMode ? "text-blue-300" : "text-blue-700"
                      } mb-2 sm:mb-3`}
                    >
                      Analysis Result (Latest):
                    </h2>
                    <p
                      className={`mb-2 text-sm ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      <strong
                        className={`${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Food Item:
                      </strong>{" "}
                      {nutritionalInfo.foodItem || "N/A"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <p
                        className={`${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        <strong
                          className={`${
                            isDarkMode ? "text-blue-200" : "text-blue-800"
                          }`}
                        >
                          Calories:
                        </strong>{" "}
                        {nutritionalInfo.calories?.value || 0}{" "}
                        {nutritionalInfo.calories?.unit || "kcal"}{" "}
                        <span
                          className={`text-xs ml-1 px-1 py-0.5 rounded-full ${
                            nutritionalInfo.calories?.confidence === "high"
                              ? "bg-indigo-200 text-indigo-800"
                              : nutritionalInfo.calories?.confidence ===
                                "medium"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          ({nutritionalInfo.calories?.confidence || "N/A"})
                        </span>
                      </p>
                      <p
                        className={`${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        <strong
                          className={`${
                            isDarkMode ? "text-blue-200" : "text-blue-800"
                          }`}
                        >
                          Protein:
                        </strong>{" "}
                        {nutritionalInfo.protein?.value || 0}{" "}
                        {nutritionalInfo.protein?.unit || "g"}{" "}
                        <span
                          className={`text-xs ml-1 px-1 py-0.5 rounded-full ${
                            nutritionalInfo.protein?.confidence === "high"
                              ? "bg-indigo-200 text-indigo-800"
                              : nutritionalInfo.protein?.confidence === "medium"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          ({nutritionalInfo.protein?.confidence || "N/A"})
                        </span>
                      </p>
                      <p
                        className={`${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        <strong
                          className={`${
                            isDarkMode ? "text-blue-200" : "text-blue-800"
                          }`}
                        >
                          Fats:
                        </strong>{" "}
                        {nutritionalInfo.fats?.value || 0}{" "}
                        {nutritionalInfo.fats?.unit || "g"}{" "}
                        <span
                          className={`text-xs ml-1 px-1 py-0.5 rounded-full ${
                            nutritionalInfo.fats?.confidence === "high"
                              ? "bg-indigo-200 text-indigo-800"
                              : nutritionalInfo.fats?.confidence === "medium"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          ({nutritionalInfo.fats?.confidence || "N/A"})
                        </span>
                      </p>
                      <p
                        className={`${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        <strong
                          className={`${
                            isDarkMode ? "text-blue-200" : "text-blue-800"
                          }`}
                        >
                          Sugars:
                        </strong>{" "}
                        {nutritionalInfo.sugars?.value || 0}{" "}
                        {nutritionalInfo.sugars?.unit || "g"}{" "}
                        <span
                          className={`text-xs ml-1 px-1 py-0.5 rounded-full ${
                            nutritionalInfo.sugars?.confidence === "high"
                              ? "bg-indigo-200 text-indigo-800"
                              : nutritionalInfo.sugars?.confidence === "medium"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          ({nutritionalInfo.sugars?.confidence || "N/A"})
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <h2
                  className={`text-xl sm:text-2xl font-bold ${
                    isDarkMode ? "text-blue-300" : "text-blue-700"
                  } mb-3 sm:mb-4`}
                >
                  Daily Digestion Summary
                </h2>

                <div className="flex justify-center mb-4 sm:mb-6">
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 rounded-l-lg text-sm sm:text-base ${
                      dailyDisplayMode === "numbers"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setDailyDisplayMode("numbers")}
                  >
                    Numbers
                  </button>
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 text-sm sm:text-base ${
                      dailyDisplayMode === "barChart"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setDailyDisplayMode("barChart")}
                  >
                    Bar Graph
                  </button>
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 rounded-r-lg text-sm sm:text-base ${
                      dailyDisplayMode === "pieChart"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setDailyDisplayMode("pieChart")}
                  >
                    Pie Chart
                  </button>
                </div>

                {dailyDisplayMode === "numbers" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center`}
                  >
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Calories
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {dailyTotals.calories.toFixed(1)} kcal
                        {recommendedDailyTargets?.recommendedCalories &&
                        typeof recommendedDailyTargets.recommendedCalories ===
                          "number" ? (
                          <span
                            className={`text-xs sm:text-base ${
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }`}
                          >
                            {" "}
                            /{" "}
                            {recommendedDailyTargets.recommendedCalories.toFixed(
                              1
                            )}
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Protein
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {dailyTotals.protein.toFixed(1)} g
                        {recommendedDailyTargets?.recommendedProtein &&
                        typeof recommendedDailyTargets.recommendedProtein ===
                          "number" ? (
                          <span
                            className={`text-xs sm:text-base ${
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }`}
                          >
                            {" "}
                            /{" "}
                            {recommendedDailyTargets.recommendedProtein.toFixed(
                              1
                            )}
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Fats
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {dailyTotals.fats.toFixed(1)} g
                        {recommendedDailyTargets?.recommendedFats &&
                        typeof recommendedDailyTargets.recommendedFats ===
                          "number" ? (
                          <span
                            className={`text-xs sm:text-base ${
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }`}
                          >
                            {" "}
                            / Max{" "}
                            {recommendedDailyTargets.recommendedFats.toFixed(1)}
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Sugars
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {dailyTotals.sugars.toFixed(1)} g
                        {recommendedDailyTargets?.recommendedSugars &&
                        typeof recommendedDailyTargets.recommendedSugars ===
                          "number" ? (
                          <span
                            className={`text-xs sm:text-base ${
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }`}
                          >
                            {" "}
                            / Max{" "}
                            {recommendedDailyTargets.recommendedSugars.toFixed(
                              1
                            )}
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {dailyDisplayMode === "barChart" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md h-48 sm:h-64`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyChartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke={isDarkMode ? "#e5e7eb" : "#374151"}
                        />
                        <YAxis stroke={isDarkMode ? "#e5e7eb" : "#374151"} />
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${value.toFixed(1)} ${
                              name === "Calories" ? "kcal" : "g"
                            }`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#374151" : "#fff",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #ccc",
                            borderRadius: "8px",
                            padding: "10px",
                          }}
                          labelStyle={{
                            fontWeight: "bold",
                            color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          fill={isDarkMode ? "#60a5fa" : "#3b82f6"}
                          name="Amount"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {dailyDisplayMode === "pieChart" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md h-48 sm:h-64 flex justify-center items-center`}
                  >
                    {dailyTotals.protein === 0 &&
                    dailyTotals.fats === 0 &&
                    dailyTotals.sugars === 0 ? (
                      <p
                        className={`${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        } text-sm sm:text-lg`}
                      >
                        Add some food to see the daily pie chart!
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dailyPieChartData.filter(
                              (item) => item.value > 0
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={60} // Smaller for mobile
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dailyPieChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              `${value.toFixed(1)} g`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: isDarkMode ? "#374151" : "#fff",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #ccc",
                              borderRadius: "8px",
                              padding: "10px",
                            }}
                            labelStyle={{
                              fontWeight: "bold",
                              color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {foodEntries.length > 0 && (
                  <div className="mt-4 sm:mt-6">
                    <h3
                      className={`text-md sm:text-lg font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      } mb-2`}
                    >
                      Logged Meals Today:
                    </h3>
                    <ul
                      className={`${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } rounded-lg divide-y ${
                        isDarkMode ? "divide-gray-600" : "divide-gray-100"
                      } shadow-sm max-h-40 sm:max-h-48 overflow-y-auto`}
                    >
                      {foodEntries
                        .filter(
                          (entry) =>
                            new Date(entry.timestamp).toDateString() ===
                            new Date().toDateString()
                        )
                        .map((entry, index) => (
                          <li
                            key={index}
                            className={`p-2 sm:p-3 text-xs sm:text-sm flex justify-between items-center ${
                              isDarkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            <span
                              className={`font-medium ${
                                isDarkMode ? "text-gray-200" : "text-gray-800"
                              }`}
                            >
                              {entry.foodItem} (
                              <span
                                className={`${
                                  isDarkMode ? "text-blue-300" : "text-blue-700"
                                }`}
                              >
                                {entry.mealType}
                              </span>
                              )
                            </span>
                            <span
                              className={`text-${
                                isDarkMode ? "gray-300" : "gray-700"
                              }`}
                            >
                              {entry.calories.value.toFixed(1)} kcal
                            </span>
                            <button
                              onClick={() =>
                                handleDeleteConfirmation(entry, "food")
                              }
                              className="ml-2 p-1 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors duration-200"
                              title="Delete food entry"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <h2
                  className={`text-xl sm:text-2xl font-bold ${
                    isDarkMode ? "text-blue-300" : "text-blue-700"
                  } mt-6 sm:mt-8 mb-3 sm:mb-4`}
                >
                  Weekly Nutrition
                </h2>

                <div className="flex justify-center mb-4 sm:mb-6">
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 rounded-l-lg text-sm sm:text-base ${
                      weeklyDisplayMode === "numbers"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setWeeklyDisplayMode("numbers")}
                  >
                    Numbers
                  </button>
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 text-sm sm:text-base ${
                      weeklyDisplayMode === "barChart"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setWeeklyDisplayMode("barChart")}
                  >
                    Bar Graph
                  </button>
                  <button
                    className={`py-1 px-3 sm:py-2 sm:px-4 rounded-r-lg text-sm sm:text-base ${
                      weeklyDisplayMode === "pieChart"
                        ? isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        : isDarkMode
                        ? "bg-blue-400 text-blue-900 hover:bg-blue-500"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    onClick={() => setWeeklyDisplayMode("pieChart")}
                  >
                    Pie Chart
                  </button>
                </div>

                {weeklyDisplayMode === "numbers" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center`}
                  >
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Calories
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {weeklyTotals.calories.toFixed(1)} kcal
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Protein
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {weeklyTotals.protein.toFixed(1)} g
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Fats
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {weeklyTotals.fats.toFixed(1)} g
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Sugars
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {weeklyTotals.sugars.toFixed(1)} g
                      </p>
                    </div>
                  </div>
                )}

                {weeklyDisplayMode === "barChart" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md h-48 sm:h-64`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyChartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke={isDarkMode ? "#e5e7eb" : "#374151"}
                        />
                        <YAxis stroke={isDarkMode ? "#e5e7eb" : "#374151"} />
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${value.toFixed(1)} ${
                              name === "Calories" ? "kcal" : "g"
                            }`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#374151" : "#fff",
                            border: isDarkMode
                              ? "1px solid #4b5563"
                              : "1px solid #ccc",
                            borderRadius: "8px",
                            padding: "10px",
                          }}
                          labelStyle={{
                            fontWeight: "bold",
                            color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="value"
                          fill={isDarkMode ? "#60a5fa" : "#3b82f6"}
                          name="Amount"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {weeklyDisplayMode === "pieChart" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-gray-600" : "bg-blue-50"
                    } p-3 sm:p-4 rounded-xl shadow-md h-48 sm:h-64 flex justify-center items-center`}
                  >
                    {weeklyTotals.protein === 0 &&
                    weeklyTotals.fats === 0 &&
                    weeklyTotals.sugars === 0 ? (
                      <p
                        className={`${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        } text-sm sm:text-lg`}
                      >
                        Add some food to see the weekly pie chart!
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={weeklyPieChartData.filter(
                              (item) => item.value > 0
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={60} // Smaller for mobile
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {weeklyPieChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [
                              `${value.toFixed(1)} g`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: isDarkMode ? "#374151" : "#fff",
                              border: isDarkMode
                                ? "1px solid #4b5563"
                                : "1px solid #ccc",
                              borderRadius: "8px",
                              padding: "10px",
                            }}
                            labelStyle={{
                              fontWeight: "bold",
                              color: isDarkMode ? "#93c5fd" : "#1d4ed8",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
                <p
                  className={`text-xs sm:text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  } mt-2 text-center`}
                >
                  Note: Weekly totals are calculated from all saved entries
                  within the last 7 days.
                </p>
              </>
            ) : (
              <div
                className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4`}
                role="alert"
              >
                <p className="font-bold text-sm sm:text-base">Login Required</p>
                <p className="text-xs sm:text-sm">
                  Please go to the "About Me" tab to register or log in to view
                  your tracking data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* About Me Tab Content */}
        {selectedTab === "aboutMe" && (
          <div className="mt-4">
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                isDarkMode ? "text-blue-300" : "text-blue-700"
              } mb-3 sm:mb-4`}
            >
              About Me
            </h2>

            {/* Authentication Section */}
            <div
              className={`bg-[var(--app-card-bg-light)] p-4 rounded-xl shadow-md mb-4 sm:mb-6`}
            >
              <h3
                className={`text-lg sm:text-xl font-semibold ${
                  isDarkMode ? "text-blue-300" : "text-blue-700"
                } mb-2 sm:mb-3`}
              >
                Account Access
              </h3>
              {!userId ? (
                <>
                  <p
                    className={`text-[var(--app-medium-text)] mb-3 sm:mb-4 text-sm`}
                  >
                    Register or log in to save and load your data. If you don't
                    have an account, enter your desired email and password and
                    click "Register".
                  </p>
                  <div className="mb-3 sm:mb-4">
                    <label
                      htmlFor="authEmail"
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      } mb-1 sm:mb-2`}
                    >
                      Email:
                    </label>
                    <input
                      id="authEmail"
                      type="email"
                      className={`w-full p-2 sm:p-3 ${
                        isDarkMode
                          ? "bg-gray-700 text-gray-200 border-gray-600"
                          : "bg-white text-gray-800 border-gray-300"
                      } rounded-lg focus:ring-${
                        isDarkMode ? "blue-400" : "blue-500"
                      } focus:border-${
                        isDarkMode ? "blue-400" : "blue-500"
                      } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                      placeholder="your.email@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-3 sm:mb-4 relative">
                    {" "}
                    {/* Added relative for positioning button */}
                    <label
                      htmlFor="authPassword"
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      } mb-1 sm:mb-2`}
                    >
                      Password:
                    </label>
                    <input
                      id="authPassword"
                      type={
                        showPassword ? "text" : "password"
                      } /* Dynamic type */
                      className={`w-full p-2 sm:p-3 pr-10 ${
                        isDarkMode
                          ? "bg-gray-700 text-gray-200 border-gray-600"
                          : "bg-white text-gray-800 border-gray-300"
                      } rounded-lg focus:ring-${
                        isDarkMode ? "blue-400" : "blue-500"
                      } focus:border-${
                        isDarkMode ? "blue-400" : "blue-500"
                      } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                    <button
                      type="button" /* Important: type="button" to prevent form submission */
                      onClick={() => setShowPassword((prev) => !prev)}
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      } top-6`} /* Adjust top for label */
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {/* Conditional SVG fill/stroke for hollow/filled circle */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill={
                          showPassword
                            ? "none"
                            : isDarkMode
                            ? "white"
                            : "var(--app-normal-text)"
                        } /* Filled when hidden, none when showing */
                        stroke={
                          showPassword
                            ? isDarkMode
                              ? "white"
                              : "var(--app-normal-text)"
                            : "none"
                        } /* Stroke with normal text color when showing */
                        strokeWidth="1.5" /* Consistent stroke width */
                      >
                        <circle cx="10" cy="10" r="5" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                    <button
                      onClick={handleRegister}
                      className={`flex-1 ${
                        isDarkMode
                          ? "bg-green-700 hover:bg-green-800"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "focus:ring-green-400"
                          : "focus:ring-green-500"
                      } focus:ring-offset-2 text-sm sm:text-base`}
                      disabled={
                        isRegistering ||
                        isLoggingIn ||
                        !authEmail ||
                        !authPassword
                      }
                    >
                      {isRegistering ? "Registering..." : "Register"}
                    </button>
                    <button
                      onClick={handleLogin}
                      className={`flex-1 ${
                        isDarkMode
                          ? "bg-blue-700 hover:bg-blue-800"
                          : "bg-blue-600 hover:bg-blue-700"
                      } text-white font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "focus:ring-blue-400"
                          : "focus:ring-blue-500"
                      } focus:ring-offset-2 text-sm sm:text-base`}
                      disabled={
                        isLoggingIn ||
                        isRegistering ||
                        !authEmail ||
                        !authPassword
                      }
                    >
                      {isLoggingIn ? "Logging In..." : "Login"}
                    </button>
                  </div>
                  {authError && (
                    <p
                      className={`${
                        isDarkMode ? "text-red-200" : "text-red-700"
                      } text-xs sm:text-sm mt-2 text-center`}
                    >
                      {authError}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <p
                    className={`text-base sm:text-lg font-semibold ${
                      isDarkMode ? "text-blue-200" : "text-blue-800"
                    } mb-3 sm:mb-4`}
                  >
                    You are logged in as {userEmail || "an anonymous user"}.
                  </p>
                  <button
                    onClick={handleLogout}
                    className={`${
                      isDarkMode
                        ? "bg-red-700 hover:bg-red-800"
                        : "bg-red-500 hover:bg-red-600"
                    } text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                      isDarkMode ? "focus:ring-red-400" : "focus:ring-red-400"
                    } focus:ring-offset-2 text-sm sm:text-base`}
                  >
                    Log Out
                  </button>
                  {authError && (
                    <p
                      className={`${
                        isDarkMode ? "text-green-200" : "text-green-700"
                      } text-xs sm:text-sm mt-2 text-center`}
                    >
                      {authError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label
                  htmlFor="weight"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-1 sm:mb-2`}
                >
                  Current Weight (kg):
                </label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  className={`w-full p-2 sm:p-3 ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-800 border-gray-300"
                  } rounded-lg focus:ring-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } focus:border-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                  placeholder="e.g., 70"
                  value={weight === 0 ? "" : weight} // Display empty string if 0 for user input
                  onChange={(e) => {
                    setWeight(parseFloat(e.target.value) || 0);
                    setError("");
                  }} // Clear error on change
                  disabled={!userId} // Disable if not logged in
                />
              </div>

              <div>
                <label
                  htmlFor="height"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-1 sm:mb-2`}
                >
                  Height (cm):
                </label>
                <input
                  id="height"
                  type="number"
                  step="0.1"
                  className={`w-full p-2 sm:p-3 ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-800 border-gray-300"
                  } rounded-lg focus:ring-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } focus:border-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                  placeholder="e.g., 175"
                  value={height === 0 ? "" : height} // Display empty string if 0 for user input
                  onChange={(e) => {
                    setHeight(parseFloat(e.target.value) || 0);
                    setError("");
                  }} // Clear error on change
                  disabled={!userId} // Disable if not logged in
                />
              </div>

              <div className="col-span-1">
                <label
                  htmlFor="dob"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-1 sm:mb-2`}
                >
                  Date of Birth:
                </label>
                <input
                  id="dob"
                  type="date"
                  className={`w-full p-2 sm:p-3 ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-800 border-gray-300"
                  } rounded-lg focus:ring-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } focus:border-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setError("");
                  }} // Clear error on change
                  disabled={!userId} // Disable if not logged in
                />
              </div>

              <div className="col-span-1">
                <label
                  htmlFor="gender"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-1 sm:mb-2`}
                >
                  Gender:
                </label>
                <select
                  id="gender"
                  className={`w-full p-2 sm:p-3 ${
                    isDarkMode
                      ? "bg-gray-700 text-gray-200 border-gray-600"
                      : "bg-white text-gray-800 border-gray-300"
                  } rounded-lg focus:ring-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } focus:border-${
                    isDarkMode ? "blue-400" : "blue-500"
                  } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    setError("");
                  }} // Clear error on change
                  disabled={!userId} // Disable if not logged in
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div
              className={`mt-6 sm:mt-8 ${
                isDarkMode ? "bg-gray-600" : "bg-blue-50"
              } p-4 sm:p-6 rounded-xl shadow-md text-center`}
            >
              {bmi && (
                <div className="mb-3 sm:mb-4">
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-blue-200" : "text-blue-800"
                    }`}
                  >
                    Your BMI is:
                  </p>
                  <p
                    className={`text-3xl sm:text-4xl font-bold ${
                      isDarkMode ? "text-blue-100" : "text-blue-900"
                    }`}
                  >
                    {bmi}
                  </p>
                  <p
                    className={`text-base sm:text-lg font-semibold mt-1 sm:mt-2 ${
                      getBmiCategory(bmi) === "Underweight"
                        ? "text-orange-600"
                        : getBmiCategory(bmi) === "Normal weight"
                        ? "text-green-600"
                        : getBmiCategory(bmi) === "Overweight"
                        ? "text-yellow-600"
                        : getBmiCategory(bmi) === "Obesity"
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    ({getBmiCategory(bmi)})
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    } mt-1 sm:mt-2`}
                  >
                    BMI Categories: Underweight &lt;18.5, Normal weight
                    18.5–24.9, Overweight 25–29.9, Obesity &ge;30
                  </p>
                </div>
              )}
              {age !== null && (
                <div className="mt-3 sm:mt-4">
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-blue-200" : "text-blue-800"
                    }`}
                  >
                    Your Age:
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold ${
                      isDarkMode ? "text-blue-100" : "text-blue-900"
                    }`}
                  >
                    {age} years
                  </p>
                </div>
              )}
              {!bmi && !age && (
                <p
                  className={`${
                    isDarkMode ? "text-blue-200" : "text-blue-800"
                  } text-sm sm:text-lg`}
                >
                  Enter your weight, height, and date of birth to see your BMI
                  and age.
                </p>
              )}
            </div>

            {/* Manual Save Button */}
            {userId && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleSaveProfile}
                  className={`bg-[var(--app-button-indigo-bg)] text-white font-semibold py-2 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--app-input-focus-ring)] focus:ring-offset-2 text-sm`}
                >
                  Save Profile Manually
                </button>
              </div>
            )}
          </div>
        )}

        {/* Target Tab Content */}
        {selectedTab === "target" && (
          <div className="mt-4">
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                isDarkMode ? "text-blue-300" : "text-blue-700"
              } mb-3 sm:mb-4`}
            >
              Set Your Target
            </h2>

            <div
              className={`flex justify-center flex-wrap sm:flex-nowrap mb-4 sm:mb-6 border-b ${
                isDarkMode ? "border-gray-600" : "border-gray-300"
              }`}
            >
              <button
                className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm font-medium rounded-t-lg sm:rounded-none ${
                  targetOption === "weightLoss"
                    ? isDarkMode
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-blue-700 border-b-2 border-blue-700"
                    : isDarkMode
                    ? "text-gray-400 hover:text-blue-300"
                    : "text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setTargetOption("weightLoss")}
              >
                Weight Loss
              </button>
              <button
                className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm font-medium rounded-t-lg sm:rounded-none ${
                  targetOption === "weightMaintenance"
                    ? isDarkMode
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-blue-700 border-b-2 border-blue-700"
                    : isDarkMode
                    ? "text-gray-400 hover:text-blue-300"
                    : "text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setTargetOption("weightMaintenance")}
              >
                Weight Maintenance
              </button>
              <button
                className={`flex-1 py-2 px-3 sm:py-3 sm:px-6 text-sm font-medium rounded-t-lg sm:rounded-none ${
                  targetOption === "muscleGain"
                    ? isDarkMode
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-blue-700 border-b-2 border-blue-700"
                    : isDarkMode
                    ? "text-gray-400 hover:text-blue-300"
                    : "text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setTargetOption("muscleGain")}
              >
                Muscle Gain
              </button>
            </div>

            {userId ? (
              (parseFloat(weight) || 0) <= 0 ||
              isNaN(parseFloat(weight)) ||
              (parseFloat(height) || 0) <= 0 ||
              isNaN(parseFloat(height)) ||
              !dob ||
              !gender ||
              age === null ||
              isNaN(age) ||
              age < 0 ? (
                <div
                  className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg`}
                  role="alert"
                >
                  <p className="font-bold text-sm sm:text-base">
                    Missing or Invalid Profile Information
                  </p>
                  <p className="text-xs sm:text-sm">
                    Please go to the "About Me" tab and ensure your **weight
                    (positive number), height (positive number), date of birth
                    (valid date), and gender** are all correctly filled in to
                    use the Target features.
                  </p>
                </div>
              ) : (
                <>
                  {" "}
                  {/* This fragment wraps the rest of the target content */}
                  {targetOption === "weightLoss" && (
                    <div
                      className={`bg-[var(--app-card-bg-light)] p-4 sm:p-6 rounded-xl shadow-inner`}
                    >
                      <h3
                        className={`text-lg sm:text-xl font-semibold ${
                          isDarkMode ? "text-blue-300" : "text-blue-700"
                        } mb-3 sm:mb-4`}
                      >
                        Weight Loss Goal
                      </h3>

                      <div className="mb-4 sm:mb-6">
                        <button
                          onClick={suggestHealthyWeightRange}
                          className={`w-full ${
                            isDarkMode
                              ? "bg-blue-700 hover:bg-blue-800"
                              : "bg-blue-600 hover:bg-blue-700"
                          } text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                            isDarkMode
                              ? "focus:ring-blue-400"
                              : "focus:ring-blue-500"
                          } focus:ring-offset-2 flex items-center justify-center gap-2 text-sm`}
                          disabled={
                            suggestingWeight ||
                            (parseFloat(age) || 0) <= 0 ||
                            (parseFloat(height) || 0) <= 0 ||
                            !gender ||
                            !isFirebaseReady ||
                            !userId
                          }
                        >
                          {suggestingWeight ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Getting Suggestion...
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9.663 17h4.673M12 3v13m-3-4l3 3m0 0l3-3"
                                />
                              </svg>
                              Suggest Healthy Weight Range
                            </>
                          )}
                        </button>
                        {suggestionError && (
                          <p
                            className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                          >
                            {suggestionError}
                          </p>
                        )}
                        {suggestedWeightRange &&
                          (Object.keys(suggestedWeightRange).length > 0 ? ( // Check if object is not empty
                            <div
                              className={`mt-3 sm:mt-4 p-2 sm:p-3 ${
                                isDarkMode ? "bg-gray-600" : "bg-blue-50"
                              } rounded-lg text-center ${
                                isDarkMode
                                  ? "border-gray-500"
                                  : "border-blue-200"
                              }`}
                            >
                              <p
                                className={`text-sm sm:text-md font-medium ${
                                  isDarkMode ? "text-blue-200" : "text-blue-800"
                                }`}
                              >
                                AI Suggested Healthy Range:
                              </p>
                              <p
                                className={`text-base sm:text-lg font-bold ${
                                  isDarkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                              >
                                {typeof suggestedWeightRange.minWeightKg ===
                                "number"
                                  ? suggestedWeightRange.minWeightKg.toFixed(1)
                                  : "N/A"}{" "}
                                kg -
                                {typeof suggestedWeightRange.maxWeightKg ===
                                "number"
                                  ? suggestedWeightRange.maxWeightKg.toFixed(1)
                                  : "N/A"}{" "}
                                kg
                              </p>
                              {suggestedWeightRange.notes && (
                                <p
                                  className={`text-xs ${
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-500"
                                  } mt-1`}
                                >
                                  Note: {suggestedWeightRange.notes}
                                </p>
                              )}
                            </div>
                          ) : null)}
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          } mt-2 text-center`}
                        >
                          Note: AI suggestions for healthy weight ranges are
                          general and not personalized medical advice. Please
                          consult a healthcare professional for specific
                          guidance.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div>
                          <label
                            htmlFor="targetWeight"
                            className={`block text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            } mb-1 sm:mb-2`}
                          >
                            My Target Weight (kg):
                          </label>
                          <input
                            id="targetWeight"
                            type="number"
                            step="0.1"
                            className={`w-full p-2 sm:p-3 ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-200 border-gray-600"
                                : "bg-white text-gray-800 border-gray-300"
                            } rounded-lg focus:ring-${
                              isDarkMode ? "blue-400" : "blue-500"
                            } focus:border-${
                              isDarkMode ? "blue-400" : "blue-500"
                            } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                            placeholder="e.g., 65"
                            value={targetWeight === 0 ? "" : targetWeight} // Display empty string if 0 for user input
                            onChange={(e) => {
                              setTargetWeight(parseFloat(e.target.value) || 0);
                              setTargetCalculationError("");
                            }} // Clear error on change
                            disabled={!userId}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="targetDate"
                            className={`block text-sm font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            } mb-1 sm:mb-2`}
                          >
                            Target Date:
                          </label>
                          <input
                            id="targetDate"
                            type="date"
                            className={`w-full p-2 sm:p-3 ${
                              isDarkMode
                                ? "bg-gray-700 text-gray-200 border-gray-600"
                                : "bg-white text-gray-800 border-gray-300"
                            } rounded-lg focus:ring-${
                              isDarkMode ? "blue-400" : "blue-500"
                            } focus:border-${
                              isDarkMode ? "blue-400" : "blue-500"
                            } transition-all duration-200 shadow-sm text-sm sm:text-base`}
                            value={targetDate}
                            onChange={(e) => {
                              setTargetDate(e.target.value);
                              setTargetCalculationError("");
                            }} // Clear error on change
                            disabled={!userId}
                          />
                        </div>
                      </div>

                      {monthlyWeightChange !== null && (
                        <div
                          className={`mt-4 sm:mt-6 p-3 sm:p-4 ${
                            isDarkMode ? "bg-gray-600" : "bg-blue-50"
                          } rounded-xl shadow-md text-center`}
                        >
                          {typeof monthlyWeightChange === "number" &&
                          !isNaN(monthlyWeightChange) &&
                          isFinite(monthlyWeightChange) ? (
                            <>
                              <p
                                className={`text-sm font-medium ${
                                  isDarkMode ? "text-blue-200" : "text-blue-800"
                                }`}
                              >
                                To reach your target, you need to lose:
                              </p>
                              <p
                                className={`text-2xl sm:text-3xl font-bold ${
                                  isDarkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                              >
                                {monthlyWeightChange.toFixed(2)} kg/month
                              </p>
                              <p
                                className={`text-xs ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                } mt-1 sm:mt-2`}
                              >
                                (This is an estimate based on your current
                                inputs. Consult a professional for personalized
                                advice.)
                              </p>
                            </>
                          ) : (
                            <p
                              className={`text-[var(--app-normal-text)] text-sm sm:text-lg`}
                            >
                              {monthlyWeightChange === null
                                ? "Enter your current weight (in 'About Me'), target weight, and a target date to calculate your monthly goal."
                                : monthlyWeightChange}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 sm:mt-6">
                        <button
                          onClick={getDailyNutritionalTargets}
                          className={`w-full ${
                            isDarkMode
                              ? "bg-indigo-700 hover:bg-indigo-800"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          } text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                            isDarkMode
                              ? "focus:ring-blue-400"
                              : "focus:ring-blue-500"
                          } focus:ring-offset-2 flex items-center justify-center gap-2 text-sm`}
                          disabled={
                            calculatingTargets ||
                            (parseFloat(weight) || 0) <= 0 ||
                            (parseFloat(targetWeight) || 0) <= 0 ||
                            !targetDate ||
                            new Date(targetDate) <= new Date() ||
                            (parseFloat(height) || 0) <= 0 ||
                            (parseFloat(age) || 0) <= 0 ||
                            !gender ||
                            !isFirebaseReady ||
                            !userId
                          }
                        >
                          {calculatingTargets ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Calculating Daily Targets...
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 19V6l12-3v13m-6 0V9.333L9 12V19m0-7l-2 5m2-5.333L9 12"
                                />
                              </svg>
                              Get Daily Nutrition Goals
                            </>
                          )}
                        </button>
                        {targetCalculationError && (
                          <p
                            className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                          >
                            {targetCalculationError}
                          </p>
                        )}
                        {recommendedDailyTargets &&
                          (Object.keys(recommendedDailyTargets).length > 0 ? ( // Check if object properties are not null
                            <div
                              className={`mt-3 sm:mt-4 p-3 sm:p-4 bg-[var(--app-card-bg-light)] rounded-lg border-[var(--app-card-border)] shadow-inner`}
                            >
                              <h4
                                className={`text-md sm:text-lg font-semibold text-[var(--app-accent-main)] mb-2`}
                              >
                                Recommended Daily Intake:
                              </h4>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Calories:
                                </strong>{" "}
                                {typeof recommendedDailyTargets.recommendedCalories ===
                                "number"
                                  ? recommendedDailyTargets.recommendedCalories.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                kcal
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Protein:
                                </strong>{" "}
                                {typeof recommendedDailyTargets.recommendedProtein ===
                                "number"
                                  ? recommendedDailyTargets.recommendedProtein.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Fats:
                                </strong>{" "}
                                Max{" "}
                                {typeof recommendedDailyTargets.recommendedFats ===
                                "number"
                                  ? recommendedDailyTargets.recommendedFats.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Sugars:
                                </strong>{" "}
                                Max{" "}
                                {typeof recommendedDailyTargets.recommendedSugars ===
                                "number"
                                  ? recommendedDailyTargets.recommendedSugars.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              {recommendedDailyTargets.notes && (
                                <p
                                  className={`text-xs text-[var(--app-light-text)] mt-2`}
                                >
                                  Note: {recommendedDailyTargets.notes}
                                </p>
                              )}
                            </div>
                          ) : null)}
                      </div>
                    </div>
                  )}
                  {targetOption === "weightMaintenance" && (
                    <div
                      className={`bg-[var(--app-card-bg-light)] p-4 sm:p-6 rounded-xl shadow-inner`}
                    >
                      <h3
                        className={`text-lg sm:text-xl font-semibold text-[var(--app-accent-main)] mb-3 sm:mb-4`}
                      >
                        Weight Maintenance Goal
                      </h3>
                      <div className="mb-4 sm:mb-6">
                        <button
                          onClick={getMaintenanceDailyGoals}
                          className={`w-full bg-[var(--app-button-primary-bg)] text-[var(--app-button-primary-text)] font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--app-input-focus-ring)] focus:ring-offset-2 flex items-center justify-center gap-2 text-sm`}
                          disabled={
                            gettingMaintenanceGoals ||
                            (parseFloat(weight) || 0) <= 0 ||
                            (parseFloat(height) || 0) <= 0 ||
                            !gender ||
                            !isFirebaseReady ||
                            !userId
                          }
                        >
                          {gettingMaintenanceGoals ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Getting Goals...
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 19V6l12-3v13m-6 0V9.333L9 12V19m0-7l-2 5m2-5.333L9 12"
                                />
                              </svg>
                              Get Maintenance Goals
                            </>
                          )}
                        </button>
                        {maintenanceGoalsError && (
                          <p
                            className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                          >
                            {maintenanceGoalsError}
                          </p>
                        )}
                        {maintenanceGoals &&
                          (Object.keys(maintenanceGoals).length > 0 ? (
                            <div
                              className={`mt-3 sm:mt-4 p-3 sm:p-4 bg-[var(--app-card-bg-light)] rounded-lg border-[var(--app-card-border)] shadow-inner`}
                            >
                              <h4
                                className={`text-md sm:text-lg font-semibold text-[var(--app-accent-main)] mb-2`}
                              >
                                Recommended Daily Intake for Maintenance:
                              </h4>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Calories:
                                </strong>{" "}
                                {typeof maintenanceGoals.recommendedCalories ===
                                "number"
                                  ? maintenanceGoals.recommendedCalories.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                kcal
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Protein:
                                </strong>{" "}
                                {typeof maintenanceGoals.recommendedProtein ===
                                "number"
                                  ? maintenanceGoals.recommendedProtein.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Fats:
                                </strong>{" "}
                                Max{" "}
                                {typeof maintenanceGoals.recommendedFats ===
                                "number"
                                  ? maintenanceGoals.recommendedFats.toFixed(1)
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Sugars:
                                </strong>{" "}
                                Max{" "}
                                {typeof maintenanceGoals.recommendedSugars ===
                                "number"
                                  ? maintenanceGoals.recommendedSugars.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              {maintenanceGoals.notes && (
                                <p
                                  className={`text-xs text-[var(--app-light-text)] mt-2`}
                                >
                                  Note: {maintenanceGoals.notes}
                                </p>
                              )}
                            </div>
                          ) : null)}
                      </div>
                    </div>
                  )}
                  {targetOption === "muscleGain" && (
                    <div
                      className={`bg-[var(--app-card-bg-light)] p-4 sm:p-6 rounded-xl shadow-inner`}
                    >
                      <h3
                        className={`text-lg sm:text-xl font-semibold text-[var(--app-accent-main)] mb-3 sm:mb-4`}
                      >
                        Muscle Gain Goal
                      </h3>
                      <div className="mb-4 sm:mb-6">
                        <button
                          onClick={getMuscleGainGoals} // Call the new function
                          className={`w-full bg-[var(--app-button-primary-bg)] text-[var(--app-button-primary-text)] font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--app-input-focus-ring)] focus:ring-offset-2 flex items-center justify-center gap-2 text-sm`}
                          disabled={
                            gettingMuscleGainGoals ||
                            (parseFloat(weight) || 0) <= 0 ||
                            (parseFloat(height) || 0) <= 0 ||
                            !gender ||
                            !isFirebaseReady ||
                            !userId
                          }
                        >
                          {gettingMuscleGainGoals ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Getting Goals...
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 19V6l12-3v13m-6 0V9.333L9 12V19m0-7l-2 5m2-5.333L9 12"
                                />
                              </svg>
                              Get Muscle Gain Goals
                            </>
                          )}
                        </button>
                        {muscleGainGoalsError && (
                          <p
                            className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                          >
                            {muscleGainGoalsError}
                          </p>
                        )}
                        {muscleGainGoals &&
                          (Object.keys(muscleGainGoals).length > 0 ? (
                            <div
                              className={`mt-3 sm:mt-4 p-3 sm:p-4 bg-[var(--app-card-bg-light)] rounded-lg border-[var(--app-card-border)] shadow-inner`}
                            >
                              <h4
                                className={`text-md sm:text-lg font-semibold text-[var(--app-accent-main)] mb-2`}
                              >
                                Recommended Daily Intake for Muscle Gain:
                              </h4>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Calories:
                                </strong>{" "}
                                {typeof muscleGainGoals.recommendedCalories ===
                                "number"
                                  ? muscleGainGoals.recommendedCalories.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                kcal
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Protein:
                                </strong>{" "}
                                {typeof muscleGainGoals.recommendedProtein ===
                                "number"
                                  ? muscleGainGoals.recommendedProtein.toFixed(
                                      1
                                    )
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Fats:
                                </strong>{" "}
                                Max{" "}
                                {typeof muscleGainGoals.recommendedFats ===
                                "number"
                                  ? muscleGainGoals.recommendedFats.toFixed(1)
                                  : "N/A"}{" "}
                                g
                              </p>
                              <p className="text-sm">
                                <strong
                                  className={`text-[var(--app-strong-text)]`}
                                >
                                  Sugars:
                                </strong>{" "}
                                Max{" "}
                                {typeof muscleGainGoals.recommendedSugars ===
                                "number"
                                  ? muscleGainGoals.recommendedSugars.toFixed(1)
                                  : "N/A"}{" "}
                                g
                              </p>
                              {muscleGainGoals.notes && (
                                <p
                                  className={`text-xs text-[var(--app-light-text)] mt-2`}
                                >
                                  Note: {muscleGainGoals.notes}
                                </p>
                              )}
                            </div>
                          ) : null)}
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div
                className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4 rounded-lg`}
                role="alert"
              >
                <p className="font-bold text-sm sm:text-base">Login Required</p>
                <p className="text-xs sm:text-sm">
                  Please go to the "About Me" tab to register or log in to set
                  and track your targets.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Workout Tab Content */}
        {selectedTab === "workout" && (
          <div className="mt-4">
            <h2
              className={`text-xl sm:text-2xl font-bold ${themeClasses.brandText} mb-3 sm:mb-4`}
            >
              Log Your Workout
            </h2>
            {userId ? (
              <>
                <div
                  className={`bg-[var(--app-card-bg-light)] p-4 rounded-xl shadow-md mb-4 sm:mb-6`}
                >
                  <div className="mb-4 sm:mb-6">
                    <label
                      htmlFor="workoutType"
                      className={`block text-sm font-medium ${themeClasses.mediumText} mb-1 sm:mb-2`}
                    >
                      Workout Type:
                    </label>
                    <input
                      id="workoutType"
                      type="text"
                      className={`w-full p-2 sm:p-3 bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg focus:ring-[var(--app-input-focus-ring)] focus:border-[var(--app-input-focus-border)] transition-all duration-200 shadow-sm text-sm sm:text-base text-[var(--app-normal-text)]`}
                      placeholder="e.g., Running, Weightlifting, Yoga"
                      value={workoutType}
                      onChange={(e) => setWorkoutType(e.target.value)}
                    />
                  </div>
                  <div className="mb-4 sm:mb-6">
                    <label
                      htmlFor="workoutDuration"
                      className={`block text-sm font-medium ${themeClasses.mediumText} mb-1 sm:mb-2`}
                    >
                      Duration (minutes):
                    </label>
                    <input
                      id="workoutDuration"
                      type="number"
                      step="1"
                      className={`w-full p-2 sm:p-3 bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg focus:ring-[var(--app-input-focus-ring)] focus:border-[var(--app-input-focus-border)] transition-all duration-200 shadow-sm text-sm sm:text-base text-[var(--app-normal-text)]`}
                      placeholder="e.g., 30, 60"
                      value={workoutDuration === 0 ? "" : workoutDuration} // Display empty string if 0 for user input
                      onChange={(e) =>
                        setWorkoutDuration(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="mb-4 sm:mb-6">
                    <label
                      htmlFor="workoutDate"
                      className={`block text-sm font-medium ${themeClasses.mediumText} mb-1 sm:mb-2`}
                    >
                      Date:
                    </label>
                    <input
                      id="workoutDate"
                      type="date"
                      className={`w-full p-2 sm:p-3 bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg focus:ring-[var(--app-input-focus-ring)] focus:border-[var(--app-input-focus-border)] transition-all duration-200 shadow-sm text-sm sm:text-base text-[var(--app-normal-text)]`}
                      value={workoutDate}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                    />
                  </div>
                  <div className="mb-4 sm:mb-6">
                    <label
                      htmlFor="workoutNotes"
                      className={`block text-sm font-medium ${themeClasses.mediumText} mb-1 sm:mb-2`}
                    >
                      Notes (optional):
                    </label>
                    <textarea
                      id="workoutNotes"
                      className={`w-full p-2 sm:p-3 bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg focus:ring-[var(--app-input-focus-ring)] focus:border-[var(--app-input-focus-border)] transition-all duration-200 shadow-sm text-sm sm:text-base text-[var(--app-normal-text)]`}
                      rows="3"
                      placeholder="e.g., Felt great today! Focused on arms."
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                    ></textarea>
                  </div>
                  <button
                    onClick={addWorkout}
                    className={`w-full bg-[var(--app-button-primary-bg)] text-[var(--app-button-primary-text)] font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--app-input-focus-ring)] focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base`}
                    disabled={
                      addingWorkout ||
                      !userId ||
                      !workoutType ||
                      !workoutDuration ||
                      !workoutDate
                    }
                  >
                    {addingWorkout ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Adding Workout...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add Workout
                      </>
                    )}
                  </button>
                  {workoutError && (
                    <p
                      className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                    >
                      {workoutError}
                    </p>
                  )}
                </div>

                {workoutEntries.length > 0 && (
                  <div className="mt-4 sm:mt-6">
                    <h3
                      className={`text-md sm:text-lg font-semibold text-[var(--app-medium-text)] mb-2`}
                    >
                      Logged Workouts:
                    </h3>
                    <ul
                      className={`bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg divide-y border-[var(--app-border-color)]] shadow-sm max-h-40 sm:max-h-48 overflow-y-auto`}
                    >
                      {workoutEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className={`p-2 sm:p-3 text-xs sm:text-sm flex justify-between items-center text-[var(--app-normal-text)]`}
                        >
                          <span
                            className={`font-medium text-[var(--app-normal-text)]`}
                          >
                            {entry.workoutType} ({entry.workoutDuration} min)
                            <span
                              className={`text-[var(--app-light-text)] ml-2`}
                            >
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                          </span>
                          {entry.workoutNotes && (
                            <span
                              className={`text-[var(--app-medium-text)] italic ml-2`}
                            >
                              {entry.workoutNotes}
                            </span>
                          )}
                          <button
                            onClick={() =>
                              handleDeleteConfirmation(entry, "workout")
                            }
                            className="ml-2 p-1 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors duration-200"
                            title="Delete workout entry"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div
                className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4 rounded-lg`}
                role="alert"
              >
                <p className="font-bold text-sm sm:text-base">Login Required</p>
                <p className="text-xs sm:text-sm">
                  Please go to the "About Me" tab to register or log in to log
                  your workouts.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Chef Tab Content */}
        {selectedTab === "aiChef" && (
          <div className="mt-4">
            <h2
              className={`text-xl sm:text-2xl font-bold ${themeClasses.brandText} mb-3 sm:mb-4`}
            >
              AI Chef: Personalized Recipes
            </h2>
            {userId ? (
              <>
                <div
                  className={`bg-[var(--app-card-bg-light)] p-4 rounded-xl shadow-md mb-4 sm:mb-6`}
                >
                  <p className={`text-sm ${themeClasses.mediumText} mb-2`}>
                    Tell the AI Chef what you'd like to cook! Describe
                    ingredients you have, dietary restrictions (e.g.,
                    vegetarian, gluten-free), preferred cuisine, or a type of
                    meal you're craving. The chef will also consider your
                    fitness goals and recent workouts.
                  </p>
                  <textarea
                    id="chefPrompt"
                    className={`w-full p-2 sm:p-3 bg-[var(--app-card-bg)] border-[var(--app-border-color)] rounded-lg focus:ring-[var(--app-input-focus-ring)] focus:border-[var(--app-input-focus-border)] transition-all duration-200 shadow-sm text-sm sm:text-base ${themeClasses.normalText}`}
                    rows="4"
                    placeholder="e.g., Chicken and broccoli, high protein. Or: Quick dinner with pantry staples, no dairy. Or: Post-workout snack, low sugar."
                    value={chefPrompt}
                    onChange={(e) => setChefPrompt(e.target.value)}
                  ></textarea>
                  {/* Validation check for profile data for better AI results */}
                  {((parseFloat(weight) || 0) <= 0 ||
                    isNaN(parseFloat(weight)) ||
                    (parseFloat(height) || 0) <= 0 ||
                    isNaN(parseFloat(height)) ||
                    !dob ||
                    !gender ||
                    age === null ||
                    isNaN(age) ||
                    age < 0) && (
                    <div
                      className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-2 rounded-lg text-xs mt-2`}
                      role="alert"
                    >
                      <p className="font-bold">Missing Profile Data</p>
                      <p>
                        For best recipe suggestions, please fill in **Weight,
                        Height, Date of Birth, and Gender** in the "About Me"
                        tab.
                      </p>
                    </div>
                  )}
                  {Object.keys(recommendedDailyTargets).length === 0 &&
                    Object.keys(maintenanceGoals).length === 0 &&
                    Object.keys(muscleGainGoals).length === 0 && (
                      <div
                        className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-2 rounded-lg text-xs mt-2`}
                        role="alert"
                      >
                        <p className="font-bold">No Fitness Goal Set</p>
                        <p>
                          Set a **Weight Loss, Maintenance, or Muscle Gain**
                          goal in the "Target" tab to get diet-aligned recipes.
                        </p>
                      </div>
                    )}

                  <button
                    onClick={generateRecipe}
                    className={`w-full ${
                      themeClasses.buttonPrimary
                    } font-semibold py-2 sm:py-3 px-3 sm:px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 ${
                      isDarkMode ? "focus:ring-blue-400" : "focus:ring-blue-500"
                    } focus:ring-offset-2 flex items-center justify-center gap-2 text-sm sm:text-base mt-4`}
                    disabled={generatingRecipe || !userId || !chefPrompt}
                  >
                    {generatingRecipe ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generating Recipe...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 15.546c-.523 0-1.054.02-.519-.519-.19.043-.377.06-.576.06A8.963 8.963 0 0112 21a9 9 0 01-9-9c0-2.316.84-4.437 2.25-6.046.21-.295.426-.583.649-.862.062-.072.12-.14.18-.205m8.618 6.106c1.196 2.87-.27 6.326-4.99 6.326-3.86 0-7-3.14-7-7 0-3.86 3.14-7 7-7 2.72 0 5.286 1.523 6.326 4.99L21 9m-1.5 5.546c.334.334.673.666 1.012 1a.75.75 0 001.06 0c.23-.23.23-.604 0-.834l-.459-.459a.75.75 0 00-1.06 0z"
                          />
                        </svg>
                        Generate Recipe
                      </>
                    )}
                  </button>
                  {recipeError && (
                    <p
                      className={`text-[var(--app-alert-red-text)] text-xs sm:text-sm mt-2 text-center`}
                    >
                      {recipeError}
                    </p>
                  )}
                </div>

                {aiRecipe && (
                  <div
                    className={`mt-4 sm:mt-6 p-3 sm:p-4 bg-[var(--app-card-bg-light)] rounded-lg border-[var(--app-card-border)] shadow-inner`}
                  >
                    <h3
                      className={`text-lg sm:text-xl font-semibold text-[var(--app-accent-main)] mb-2 sm:mb-3`}
                    >
                      AI-Generated Recipe:
                    </h3>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: aiRecipe.replace(/\n/g, "<br/>"),
                      }}
                    ></div>
                  </div>
                )}
              </>
            ) : (
              <div
                className={`bg-[var(--app-alert-orange-bg)] border-l-4 border-[var(--app-alert-orange-border)] text-[var(--app-alert-orange-text)] p-3 sm:p-4 rounded-lg`}
                role="alert"
              >
                <p className="font-bold text-sm sm:text-base">Login Required</p>
                <p className="text-xs sm:text-sm">
                  Please go to the "About Me" tab to register or log in to use
                  the AI Chef.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
              className={`bg-[var(--app-card-bg)] p-6 rounded-lg shadow-xl text-center w-full max-w-sm border border-[var(--app-border-color)]`}
            >
              <p
                className={`text-lg font-semibold mb-4 text-[var(--app-normal-text)]`}
              >
                Are you sure?
              </p>
              <p className={`text-sm text-[var(--app-medium-text)] mb-6`}>
                This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={confirmDelete}
                  className={`bg-[var(--app-button-danger-bg)] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity`}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className={`bg-[var(--app-button-secondary-bg)] text-[var(--app-button-secondary-text)] font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
