# Задание 5 — Three.js UI и PBR

Открыть: https://gglev.github.io/webar/task5/

AR: нажать START AR на поддерживаемом устройстве, найти поверхность и коснуться её. Панель использует обязательный DOM Overlay; beforexrselect предотвращает повторное размещение при касании кнопок. Выход из AR возвращает предпросмотр, повторная сессия очищает состояние.

Модули: ARScene — сцена и WebXR; UIManager — интерфейс и события; ResourceLoader — HDRI и PMREM; app.js — связывание классов. HDRI хранится в task1/assets/environment.hdr. Смена модели использует процедурную geometry, GLTFLoader для этих примитивов не нужен.

