#!/usr/bin/env python3
"""Optional CPU workflow, run on your own computer. Never installed on Render.
No API keys, network requests, paid providers, or automatic model downloads.
Download the chosen open-source models yourself, then use local paths.
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    return f'{milliseconds // 3600000:02}:{milliseconds // 60000 % 60:02}:{milliseconds // 1000 % 60:02}.{milliseconds % 1000:03}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    parser.add_argument('--whisper-model', type=pathlib.Path, help='Existing faster-whisper model directory')
    parser.add_argument('--translation-model', type=pathlib.Path, help='Existing Marian-compatible local model directory')
    parser.add_argument('--language', choices=['yo', 'ig', 'ha', 'fr', 'nl', 'el', 'he', 'es', 'pt', 'de', 'ar', 'sw', 'zh'])
    parser.add_argument('--piper-model', type=pathlib.Path, help='Optional existing Piper voice model; uses only local inference')
    parser.add_argument('--artwork', type=pathlib.Path, help='Optional approved PNG/JPEG to make a static-artwork video')
    args = parser.parse_args()
    if not args.audio.is_file() or not shutil.which('ffmpeg'):
        parser.error('An existing recording and FFmpeg are required.')
    if args.output.exists():
        parser.error('Choose a new output directory. Existing originals and outputs are never overwritten.')
    for model in [args.whisper_model, args.translation_model]:
        if model and not model.is_dir():
            parser.error('Use an already downloaded local model directory.')
    if args.translation_model and (not args.whisper_model or not args.language):
        parser.error('Translation requires a transcript model and target language.')
    args.output.mkdir(parents=True)
    original = args.output / ('original' + args.audio.suffix)
    shutil.copy2(args.audio, original)
    enhanced = args.output / 'enhanced.ogg'
    # Conservative general-purpose preset; listen and adjust before publication.
    subprocess.run(['ffmpeg', '-nostdin', '-n', '-i', str(original), '-vn', '-af',
                    'highpass=f=85,afftdn=nf=-25,acompressor=threshold=0.12:ratio=2.5:attack=8:release=250,loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ac', '1', '-c:a', 'libopus', '-b:a', '48k', str(enhanced)], check=True)
    manifest = {'original': original.name, 'enhanced': enhanced.name, 'status': 'awaiting_review', 'transcription': 'not_requested', 'translations': {}}
    if args.whisper_model:
        from faster_whisper import WhisperModel
        model = WhisperModel(str(args.whisper_model), device='cpu', compute_type='int8', local_files_only=True)
        segments, info = model.transcribe(str(enhanced), language='en', vad_filter=True)
        segments = list(segments)
        transcript = '\n'.join(s.text.strip() for s in segments)
        (args.output / 'transcript-en.txt').write_text(transcript, encoding='utf-8')
        captions = 'WEBVTT\n\n' + '\n\n'.join(timestamp(s.start) + ' --> ' + timestamp(s.end) + '\n' + s.text.strip() for s in segments)
        (args.output / 'captions-en.vtt').write_text(captions, encoding='utf-8')
        references = sorted(set(re.findall(r'\b(?:[1-3]\s)?[A-Z][a-z]+\s+\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?', transcript)))
        notes = {'summary_draft': ' '.join(re.split(r'(?<=[.!?])\s+', transcript)[:5]), 'possible_scripture_references_to_verify': references,
                 'review_required': True, 'key_teachings': '', 'applications': '', 'prayer_points': '', 'faith_declarations': '', 'reflection_questions': ''}
        (args.output / 'study-draft.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding='utf-8')
        manifest['transcription'] = 'generated_unreviewed'
        if args.translation_model:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            tokenizer = AutoTokenizer.from_pretrained(str(args.translation_model), local_files_only=True)
            translator = AutoModelForSeq2SeqLM.from_pretrained(str(args.translation_model), local_files_only=True)
            translated = []
            for paragraph in transcript.split('\n'):
                tokens = tokenizer(paragraph, return_tensors='pt', truncation=False)
                if tokens['input_ids'].shape[-1] > 450:
                    raise ValueError('A segment exceeds the model context. Split it manually; no text was silently truncated.')
                result = translator.generate(**tokens, max_new_tokens=512)
                translated.append(tokenizer.decode(result[0], skip_special_tokens=True))
            (args.output / ('transcript-' + args.language + '.txt')).write_text('\n'.join(translated), encoding='utf-8')
            manifest['translations'][args.language] = 'generated_unreviewed'
            translated_vtt = 'WEBVTT\n\n' + '\n\n'.join(timestamp(s.start) + ' --> ' + timestamp(s.end) + '\n' + text for s, text in zip(segments, translated))
            (args.output / ('captions-' + args.language + '.vtt')).write_text(translated_vtt, encoding='utf-8')
        if args.piper_model:
            if not args.piper_model.is_file() or not shutil.which('piper'):
                raise ValueError('Piper executable and an existing licensed voice model are required.')
            voice_text = '\n'.join(translated) if args.translation_model else transcript
            wave = args.output / 'translated-voice.wav'
            subprocess.run(['piper', '--model', str(args.piper_model), '--output_file', str(wave)], input=voice_text, text=True, check=True)
            subprocess.run(['ffmpeg', '-nostdin', '-n', '-i', str(wave), '-c:a', 'libopus', '-b:a', '48k', str(args.output / 'translated-voice.ogg')], check=True)
            manifest['generated_voice'] = 'local_piper_not_pastor_voice'
    if args.artwork:
        if not args.artwork.is_file():
            raise ValueError('Provide an approved existing artwork file.')
        subprocess.run(['ffmpeg', '-nostdin', '-n', '-loop', '1', '-i', str(args.artwork), '-i', str(enhanced),
                        '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '96k', '-pix_fmt', 'yuv420p', '-shortest', str(args.output / 'sermon-video.mp4')], check=True)
    (args.output / 'processing-log.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('Local files prepared. Listen, check scripture and translations, then import into Sermon Studio. Nothing was published or uploaded.')


if __name__ == '__main__':
    main()
