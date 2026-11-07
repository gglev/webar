using UnityEngine;
using WebXR;

namespace WebAR {
    // Uses the central viewer pose of the official five-camera WebXR rig.
    // Keeps a desktop preview and follows the viewer after entering AR.
    public sealed class ViewerSpaceObject : MonoBehaviour {
        public WebXRCamera cameraSet;
        public Transform content;
        [Range(0.3f, 2f)] public float distance = 0.7f;
        private float previewAngle;

        private void LateUpdate() {
            if (cameraSet == null || content == null) return;
            var cameraParent = cameraSet.GetCamera(WebXRCamera.CameraID.Main).transform.parent;
            Vector3 position = cameraParent.TransformPoint(cameraSet.GetLocalPosition());
            Quaternion rotation = cameraParent.rotation * cameraSet.GetLocalRotation();
            content.position = position + rotation * Vector3.forward * distance;
            bool ar = WebXRManager.Instance != null && WebXRManager.Instance.XRState == WebXRState.AR;
            if (!ar) previewAngle += 20f * Time.deltaTime;
            content.rotation = rotation * Quaternion.Euler(18f, ar ? 30f : previewAngle, 0f);
        }
    }
}
