import { isBinary } from "istextorbinary";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

enum FileType {
    Assembly,
    Binary,
    Text,
}

enum AssemblyType { ManagedMicrosoft, ManagedJava, Unmanaged, NotApplicable }
enum MagicNumber { DOS, ELF, OtherOrNotApplicable }

interface Analysis {
    fileType: FileType;
    assemblyType: AssemblyType;
    extension: string;
    magicNumber: MagicNumber;
}

type Tag =
    // managed languages/formats
    "dotnet" | "java" |
    // unmanaged formats
    "elf" | "dos" |
    // general tags
    "managed" | "unmanaged" |
    // file types
    "model" | // model files (obj, stl, step, glb, gltf, blend, mdl, fbx)
    "cad" | // cad files (f3d, scad)
    "source" | // source files (c, cpp, cs, js, ts, py, s, asm)
    "shell" | // shell files (sh, fish)
    "graphic" | // graphic files (png, jpg, svg)
    "image" | // image files (img, iso)
    "archive" | // archive files (tar, xz, gz, zip, lzma, bz2)
    "other";

export async function analyseFile(path: string): Promise<Analysis>
{
    const file = Buffer.concat([await readFile(path), Buffer.alloc(8)]); // append 8 bytes at the end so empty files won't cause read errors when trying to access nonexistent bytes

    const fileIsBinary = isBinary(path, file);
    const fileIsDOSExe = file.readUint16BE() == 0x4D5A; // Matches DOS Executable & Windows peexe Stub

    let fileType: FileType;
    let assemblyType: AssemblyType;
    let magicNumber: MagicNumber | undefined = undefined;

    // determine assembly type
    if (fileIsDOSExe && file.includes("mscoree.dll")) // Microsoft .NET (C#, F#) [managed]
        assemblyType = AssemblyType.ManagedMicrosoft
    else if (file.readUint32BE() == 0xcafebabe) // Java (magic number funny :3) [managed]
        assemblyType = AssemblyType.ManagedJava;
    else if (file.readUint8() == 0x7f && file.subarray(1, 4).toString() == "ELF") { // POSIX ELF [unmanaged]
        assemblyType = AssemblyType.Unmanaged;
        magicNumber = MagicNumber.ELF;
    }
    else if (fileIsDOSExe) // DOS/Windows [unmanaged]
        assemblyType = AssemblyType.Unmanaged // if a file has the DOS magic number and lacks mscoree.dll (condition from earlier), it's unmanaged usually
    else assemblyType = AssemblyType.NotApplicable;

    // magic numbers
    if (fileIsDOSExe) // Windows/DOS Executable
        magicNumber = MagicNumber.DOS;
    else if (magicNumber == MagicNumber.ELF) {}
    else magicNumber = MagicNumber.OtherOrNotApplicable;

    if (assemblyType != AssemblyType.NotApplicable) fileType = FileType.Assembly;
    else if (fileIsBinary) fileType = FileType.Binary;
    else fileType = FileType.Text;

    return {
        fileType, assemblyType, magicNumber,
        extension: extname(path).substring(1),
    }
}

export function tagFile(analysis: Analysis): Tag[] {
    let tags: Tag[] = [];

    // assembly stuff!
    switch (analysis.assemblyType) {
        case AssemblyType.ManagedMicrosoft:
            tags.push("dotnet");
            tags.push("managed"); 
            break;
        case AssemblyType.ManagedJava:
            tags.push("java");
            tags.push("managed"); 
            break;
        case AssemblyType.Unmanaged:
            tags.push("unmanaged");
    }

    // magic number stuff!
    switch (analysis.magicNumber) {
        case MagicNumber.DOS:
            tags.push("dos");
            break;
        case MagicNumber.ELF:
            tags.push("elf");
    }

    // extension stuff
    switch (analysis.extension) {
        case "obj":
        case "stl":
        case "step":
        case "glb":
        case "gltf":
        case "blend":
        case "mdl":
        case "fbx":
            tags.push("model");
            break;
        
        case "f3d":
        case "scad":
            tags.push("cad");
            break;

        case "c":
        case "h":
        case "cpp":
        case "c++":
        case "hpp":
        case "h++":
        case "m":
        case "cs":
        case "csharp":
        case "js":
        case "ts":
        case "coffee":
        case "py":
        case "s":
        case "asm":
            tags.push("source");
            break;
        
        case "sh":
        case "zsh":
        case "fish":
            tags.push("shell");
            break;
        
        case "png":
        case "jpg":
        case "jpeg":
        case "svg":
            tags.push("graphic");
            break;
        
        case "img":
        case "iso":
            tags.push("image");
            break;
        
        case "tar":
        case "xz":
        case "gz":
        case "zip":
        case "lzma":
        case "lzma2":
        case "bz2":
        case "7z":
            tags.push("archive");
            break;

        case "elf":
        case "exe":
        case "class":
            break; // already tagged
        
        default:
            tags.push("other");
    }

    return tags;
}