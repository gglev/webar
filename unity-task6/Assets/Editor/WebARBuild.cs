using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEditor.XR.Management;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.XR.Management;
using WebXR;

namespace WebAR.Editor {
    [InitializeOnLoad]
    public static class WebARBuild {
        const string Request = "BuildRequested.txt";
        const string Running = "BuildRunning.txt";
        static WebARBuild() { EditorApplication.delayCall += AutoBuild; }
        static void AutoBuild() {
            if (!File.Exists(Request)) return;
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) {
                EditorApplication.delayCall += AutoBuild;
                return;
            }
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL) {
                EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
                EditorApplication.delayCall += AutoBuild;
                return;
            }
            Build();
        }

        [MenuItem("WebAR/Prepare scene and build WebGL")]
        public static void Build() {
            string output = File.Exists(Request) ? File.ReadAllText(Request).Trim() : Path.GetFullPath("Build/WebAR");
            if (File.Exists(Request)) File.Move(Request, Running);
            try {
                Configure();
                CreateScene();
                AssetDatabase.SaveAssets();
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                    scenes = new[] { "Assets/Scenes/WebAR.unity" },
                    locationPathName = output,
                    target = BuildTarget.WebGL,
                    options = BuildOptions.None
                });
                var summary = report.summary;
                string result = "{\"result\":\"" + summary.result + "\",\"bytes\":" + summary.totalSize +
                    ",\"seconds\":" + summary.totalTime.TotalSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture) +
                    ",\"errors\":" + summary.totalErrors + ",\"warnings\":" + summary.totalWarnings + "}";
                File.WriteAllText("BuildResult.json", result);
                if (summary.result != BuildResult.Succeeded) throw new Exception("WebGL build failed: " + summary.result);
                Debug.Log("WEBAR_BUILD_SUCCEEDED " + output + " " + result);
                File.Delete(Running);
            } catch (Exception e) {
                File.WriteAllText("BuildError.txt", e.ToString());
                Debug.LogException(e);
            }
        }

        static void Configure() {
            PlayerSettings.companyName = "MIREA";
            PlayerSettings.productName = "WebAR Task 6";
            PlayerSettings.bundleVersion = "1.0.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.Low);
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.decompressionFallback = false;
            PlayerSettings.WebGL.threadsSupport = false;
            PlayerSettings.WebGL.template = "PROJECT:WebAR";
            PlayerSettings.WebGL.initialMemorySize = 128;
            PlayerSettings.WebGL.maximumMemorySize = 512;
            PlayerSettings.WebGL.powerPreference = WebGLPowerPreference.HighPerformance;
            PlayerSettings.runInBackground = true;
            PlayerSettings.defaultWebScreenWidth = 960;
            PlayerSettings.defaultWebScreenHeight = 600;
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 });
            EditorUserBuildSettings.development = false;
            EditorUserBuildSettings.connectProfiler = false;
            EditorUserBuildSettings.allowDebugging = false;
            // Keep the official legacy five-camera path, supported since WebXR 0.22.
            var xr = AssetDatabase.LoadAssetAtPath<WebXRSettings>("Assets/XR/WebXRSettings.asset");
            if (xr == null) {
                xr = ScriptableObject.CreateInstance<WebXRSettings>();
                AssetDatabase.CreateAsset(xr, "Assets/XR/WebXRSettings.asset");
            }
            xr.DisableXRDisplaySubsystem = true;
            xr.AutoLoadWebXRManager = true;
            xr.AutoLoadWebXRInputSystem = false;
            xr.ARRequiredReferenceSpace = WebXRSettings.ReferenceSpaceTypes.local;
            xr.AROptionalFeatures = 0;
            xr.VROptionalFeatures = 0;
            EditorBuildSettings.AddConfigObject("WebXR.Settings", xr, true);
            EditorUtility.SetDirty(xr);
            var all = AssetDatabase.LoadAssetAtPath<XRGeneralSettingsPerBuildTarget>("Assets/XR/XRGeneralSettingsPerBuildTarget.asset");
            if (all == null) {
                all = ScriptableObject.CreateInstance<XRGeneralSettingsPerBuildTarget>();
                AssetDatabase.CreateAsset(all, "Assets/XR/XRGeneralSettingsPerBuildTarget.asset");
            }
            EditorBuildSettings.AddConfigObject(XRGeneralSettings.k_SettingsKey, all, true);
            if (!all.HasSettingsForBuildTarget(BuildTargetGroup.WebGL)) all.CreateDefaultSettingsForBuildTarget(BuildTargetGroup.WebGL);
            if (!all.HasManagerSettingsForBuildTarget(BuildTargetGroup.WebGL)) all.CreateDefaultManagerSettingsForBuildTarget(BuildTargetGroup.WebGL);
            var general = all.SettingsForBuildTarget(BuildTargetGroup.WebGL);
            general.InitManagerOnStart = true;
            var manager = general.Manager;
            var loader = AssetDatabase.LoadAssetAtPath<WebXRLoader>("Assets/XR/WebXRLoader.asset");
            if (loader == null) {
                loader = ScriptableObject.CreateInstance<WebXRLoader>();
                AssetDatabase.CreateAsset(loader, "Assets/XR/WebXRLoader.asset");
            }
            if (!manager.activeLoaders.Contains(loader) && !manager.TryAddLoader(loader)) throw new Exception("Cannot register WebXR loader");
            EditorUtility.SetDirty(manager);
            EditorUtility.SetDirty(general);
            EditorUtility.SetDirty(all);
            AssetDatabase.SaveAssets();
        }

        static void CreateScene() {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var rig = new GameObject("WebXRCameraSet");
            var poses = new GameObject("ViewerCameras");
            poses.transform.SetParent(rig.transform, false);
            var cams = new Camera[5];
            string[] names = { "Main Camera", "Left VR Camera", "Right VR Camera", "Left AR Camera", "Right AR Camera" };
            for (int i = 0; i < cams.Length; i++) {
                var go = new GameObject(names[i]);
                go.transform.SetParent(poses.transform, false);
                cams[i] = go.AddComponent<Camera>();
                cams[i].nearClipPlane = 0.02f;
                cams[i].farClipPlane = 50;
                cams[i].clearFlags = CameraClearFlags.SolidColor;
                cams[i].backgroundColor = i >= 3 ? new Color(0,0,0,0) : new Color(0.025f,0.04f,0.07f,1);
                cams[i].enabled = i == 0;
                if (i == 0) { go.tag = "MainCamera"; go.AddComponent<AudioListener>(); }
            }
            var webCamera = poses.AddComponent<WebXRCamera>();
            var serialized = new SerializedObject(webCamera);
            string[] fields = { "cameraMain", "cameraL", "cameraR", "cameraARL", "cameraARR" };
            for (int i = 0; i < fields.Length; i++) serialized.FindProperty(fields[i]).objectReferenceValue = cams[i];
            serialized.ApplyModifiedPropertiesWithoutUndo();
            foreach (var hand in new[] { WebXRControllerHand.LEFT, WebXRControllerHand.RIGHT }) {
                var go = new GameObject(hand + " WebXRController");
                go.transform.SetParent(rig.transform, false);
                go.AddComponent<WebXRController>().hand = hand;
            }
            // Save reusable, inspector-wired camera/controller prefab.
            PrefabUtility.SaveAsPrefabAsset(rig, "Assets/WebXRCameraSet.prefab");
            var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = "Viewer Space Cube";
            cube.transform.localScale = Vector3.one * 0.15f;
            var mat = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/CubePBR.mat");
            if (mat == null) {
                mat = new Material(Shader.Find("Standard"));
                AssetDatabase.CreateAsset(mat, "Assets/Materials/CubePBR.mat");
            }
            mat.color = new Color(0.12f, 0.72f, 0.95f);
            mat.SetFloat("_Metallic", 0.2f);
            mat.SetFloat("_Glossiness", 0.6f);
            cube.GetComponent<MeshRenderer>().sharedMaterial = mat;
            EditorUtility.SetDirty(mat);
            var follower = new GameObject("ViewerPlacement").AddComponent<ViewerSpaceObject>();
            follower.cameraSet = webCamera;
            follower.content = cube.transform;
            var light = new GameObject("Key Light").AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.5f;
            light.transform.rotation = Quaternion.Euler(45,-30,0);
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.5f,0.55f,0.65f);
            QualitySettings.antiAliasing = 2;
            EditorSceneManager.SaveScene(scene, "Assets/Scenes/WebAR.unity");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/WebAR.unity", true) };
            Selection.activeGameObject = cube;
        }
    }
}
