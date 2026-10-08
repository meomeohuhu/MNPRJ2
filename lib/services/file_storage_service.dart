import 'dart:io';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class FileStorageService {
  Future<({String originalPath, String thumbnailPath})> saveReceipt(File source) async {
    if (!await source.exists()) throw const FileSystemException('Không tìm thấy ảnh hóa đơn');
    final root = await getApplicationDocumentsDirectory();
    final directory = Directory(p.join(root.path, 'receipts'));
    await directory.create(recursive: true);
    final stamp = DateTime.now().microsecondsSinceEpoch;
    final extension = p.extension(source.path).isEmpty ? '.jpg' : p.extension(source.path);
    final originalPath = p.join(directory.path, 'receipt_$stamp$extension');
    final thumbnailPath = p.join(directory.path, 'receipt_${stamp}_thumb.jpg');
    await source.copy(originalPath);

    final bytes = await source.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded != null) {
      final thumbnail = img.copyResize(decoded, width: 480);
      await File(thumbnailPath).writeAsBytes(img.encodeJpg(thumbnail, quality: 82));
    } else {
      await source.copy(thumbnailPath);
    }
    return (originalPath: originalPath, thumbnailPath: thumbnailPath);
  }

  Future<void> deleteIfUnreferenced(String? path, Iterable<String?> referencedPaths) async {
    if (path == null || path.isEmpty || referencedPaths.contains(path)) return;
    final file = File(path);
    if (await file.exists()) await file.delete();
  }
}
