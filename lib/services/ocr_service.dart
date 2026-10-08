import 'dart:io';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  Future<String> recognizeText(File imageFile) async {
    if (!await imageFile.exists()) throw const FileSystemException('Ảnh OCR không tồn tại');
    final stopwatch = Stopwatch()..start();
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final image = InputImage.fromFilePath(imageFile.path);
      final result = await recognizer.processImage(image);
      final text = result.text.trim();
      if (text.isEmpty) throw const FormatException('Không nhận diện được chữ trên hóa đơn');
      print('ReceiptWise OCR completed in ${stopwatch.elapsedMilliseconds} ms');
      return text;
    } finally {
      stopwatch.stop();
      await recognizer.close();
    }
  }
}
