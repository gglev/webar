# Задание 6 — Unity WebXR

Unity **6000.6.8f1**, WebXR Export и WebXR Interactions **0.25.0**, XR Plug-in Management **4.5.3**.
Пакеты De-Panther включены в `Packages`, их лицензии сохранены.

## Открыть и собрать

1. В Unity Hub добавить эту папку через Add project from disk.
2. В Advanced project options → Add command line arguments добавить `--burst-disable-compilation -buildTarget WebGL`.
3. Открыть `Assets/Scenes/WebAR.unity`.
4. Выбрать меню **WebAR → Prepare scene and build WebGL**. Оно заново создаёт учебную сцену и собирает её в `Build/WebAR`.
   Для сохранения собственных правок сцены используйте обычный Build в Unity.

В этой сцене использован поддерживаемый WebXR Export путь Built-in Render Pipeline с `DisableXRDisplaySubsystem = true`, компонентом WebXRCamera, пятью камерами и двумя WebXRController. Префаб камеры называется `WebXRCameraSet`.

`ViewerSpaceObject.cs` вычисляет центральную позу зрителя через WebXRCamera. В AR куб находится на расстоянии 0.7 м по направлению взгляда; в обычном браузере доступен вращающийся предпросмотр. Куб не привязывается к поверхности.

Настройки WebGL: сжатие отключено, Decompression Fallback выключен, threadsSupport выключен, WebGL 2, Linear color space, IL2CPP, Development Build выключен.

## Открыть сборку

GitHub Pages: https://gglev.github.io/webar/task6/
После загрузки появится предпросмотр. На устройстве с поддержкой immersive-ar станет доступна кнопка «Запустить AR». Разрешение и начало сессии требуют действия пользователя.

Для проверки в обычном браузере допустим `http://localhost`. Для мобильного AR нужен HTTPS с доверенным сертификатом, например GitHub Pages.

## Локальный HTTPS

При установленном Caddy создайте Caddyfile (IP и путь заменить):

```
https://192.168.1.10:8443 {
    tls internal
    root * /absolute/path/to/Build/WebAR
    file_server
}
```

Компьютер и телефон должны находиться в одной сети. Корневой сертификат локального Caddy нужно самостоятельно установить и включить как доверенный на телефоне. Затем открыть указанный HTTPS-адрес. Проверка на физическом телефоне проводится отдельно; наличие предпросмотра не подтверждает поддержку AR.

## Если импорт Unity зависает

На этом компьютере обнаружены два зависания первого запуска: Burst bootstrap и ILPP configuration watcher. Первое обходится параметром `--burst-disable-compilation`. Для второго при запуске Unity из терминала задайте переменную `DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false`.

```
DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false "/Applications/Unity/Hub/Editor/6000.6.8f1/Unity.app/Contents/MacOS/Unity" -projectPath "$PWD" -buildTarget WebGL --burst-disable-compilation
```

Это отключает автоматическое перечитывание конфигурации служебного .NET-процесса и не меняет исходники Unity.

## Проверка сборки

Сборка выполнена успешно, 0 ошибок. Размер несжатых файлов: 16.72 МиБ. Предпросмотр WebGL загружен в браузере. Проверка AR на физическом телефоне ещё не выполнена. В сборке есть предупреждения устаревшего API стороннего пакета; подробности в BuildResult.json.
