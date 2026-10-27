; Protégé's Windows installer (Inno Setup 6, free). Built by scripts/release.ts:
;   iscc /DAppVersion=0.1.0 /DSourceDir=<the release folder> /DOutputDir=<release> protege.iss
;
; Installs for this user only (no admin rights, which teachers often don't have on school laptops), into
; %LOCALAPPDATA%\Programs\Protege. Classes and students live in %LOCALAPPDATA%\Protege, which updating never
; touches; uninstalling asks before deleting them. School IT can install silently: Protege-Setup.exe /VERYSILENT

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{6F1C2E5A-9B4D-4E7A-8C3F-2D5B7A9E1F40}
AppName=Protégé
AppVersion={#AppVersion}
AppVerName=Protégé {#AppVersion}
AppPublisher=Protégé (open source, AGPL-3.0)
AppPublisherURL=https://protege-edu.pages.dev
AppSupportURL=https://protege-edu.pages.dev/guide
DefaultDirName={localappdata}\Programs\Protege
DefaultGroupName=Protégé
PrivilegesRequired=lowest
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableWelcomePage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SourceDir={#SourceDir}
OutputDir={#OutputDir}
OutputBaseFilename=Protege-Setup
SetupIconFile={#SourcePath}protege.ico
UninstallDisplayIcon={app}\protege.ico
UninstallDisplayName=Protégé
WizardStyle=modern
WizardImageFile={#SourcePath}wizard.png
WizardSmallImageFile={#SourcePath}wizard-small.png
Compression=lzma2/max
SolidCompression=yes
CloseApplications=no
ShowLanguageDialog=auto

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"

[Messages]
en.ReadyLabel1=Protégé is ready to install.
en.ReadyLabel2a=It installs for you only, and doesn't need admin rights. The first time it opens, Gloam's brain downloads by itself (a few GB).
fr.ReadyLabel1=Protégé est prêt à être installé.
fr.ReadyLabel2a=Il s'installe pour vous seulement, sans droits d'administrateur. À la première ouverture, le cerveau de Gloam se télécharge tout seul (quelques Go).

[CustomMessages]
en.OpenProtege=Open Protégé
fr.OpenProtege=Ouvrir Protégé
en.StopProtege=Stop Protégé
fr.StopProtege=Arrêter Protégé
en.OnlineProtege=Protégé online (students outside school)
fr.OnlineProtege=Protégé en ligne (élèves hors de l'école)
en.Voices=Set up Gloam's voices
fr.Voices=Installer les voix de Gloam
en.Restore=Restore a backup
fr.Restore=Restaurer une sauvegarde
en.DeleteData=Also delete your classes and your students' information from this computer?%n%nChoose No to keep them (for example, if you're reinstalling Protégé). Gloam's brain (Ollama) is a separate app: remove it from Windows Settings if you want.
fr.DeleteData=Supprimer aussi vos classes et les renseignements de vos élèves de cet ordinateur?%n%nChoisissez Non pour les garder (par exemple, si vous réinstallez Protégé). Le cerveau de Gloam (Ollama) est une application à part : retirez-la dans les Paramètres de Windows si vous le voulez.

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourcePath}protege.ico"; DestDir: "{app}"; Flags: ignoreversion

[InstallDelete]
; an update replaces the app completely (old files never linger); the classes are elsewhere and untouched
Type: filesandordirs; Name: "{app}\app"

[UninstallDelete]
; what Protégé made while it ran (its page cache): the classes live elsewhere and are only deleted if the teacher says so
Type: filesandordirs; Name: "{app}\app"

[Icons]
Name: "{group}\Protégé"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"""; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"; Flags: runminimized
Name: "{group}\{cm:StopProtege}"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"" --stop"; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"; Flags: runminimized
Name: "{group}\{cm:OnlineProtege}"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"" --tunnel"; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"
Name: "{group}\{cm:Voices}"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"" --setup-voice"; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"
Name: "{group}\{cm:Restore}"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"" --restore"; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"
Name: "{userdesktop}\Protégé"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"""; WorkingDir: "{app}"; IconFilename: "{app}\protege.ico"; Flags: runminimized

[Run]
Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"""; WorkingDir: "{app}"; Description: "{cm:OpenProtege}"; Flags: postinstall nowait runminimized

[UninstallRun]
Filename: "{app}\node\node.exe"; Parameters: """{app}\launch.js"" --stop"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated; RunOnceId: "StopProtege"

[Code]
// Stop a running Protégé before updating it (its files are in use while it runs)
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  if FileExists(ExpandConstant('{app}\node\node.exe')) then
    Exec(ExpandConstant('{app}\node\node.exe'), '"' + ExpandConstant('{app}\launch.js') + '" --stop', ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;

// Uninstalling: ask before deleting the classes (No is the safe default)
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if (CurUninstallStep = usPostUninstall) and not UninstallSilent then
    if MsgBox(CustomMessage('DeleteData'), mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
      DelTree(ExpandConstant('{localappdata}\Protege'), True, True, True);
end;
