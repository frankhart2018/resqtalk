import torchaudio


def load_audio_from_file(file_path, target_sample_rate=16000):
    """
    Load audio directly from file path using torchaudio
    """
    waveform, sample_rate = torchaudio.load(file_path)

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    if sample_rate != target_sample_rate:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=target_sample_rate
        )
        waveform = resampler(waveform)

    return waveform.squeeze().numpy()
