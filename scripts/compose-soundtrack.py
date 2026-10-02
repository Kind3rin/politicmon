"""Original Politicmon scores and deterministic stereo synthesis (no third-party music).

Requires NumPy and Apple's afconvert for AAC. WAV masters stay in ignored
artifacts; the game loads one compressed loop at a time, plus one recent loop.
"""
from pathlib import Path
import hashlib, json, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 22050
# id, title, bpm, tonic (MIDI), mode, motif, chord degrees, percussion voice.
# Motifs and arrangements are newly composed; none read the legacy audio.ts.
SCORES = [
 ('title','LA SIGLA SENZA ALLEGATO',112,60,'major',[0,4,2,7,9,7,4,2],[0,5,3,4],'march'),
 ('borgo','IL CIRCOLO APRE PRESTO',96,60,'major',[4,2,0,7,4,9,7,2],[0,3,5,4],'brush'),
 ('mediopoli','FUORI DAL FUORI ONDA',118,62,'major',[2,7,4,9,7,2,4,0],[0,5,1,4],'beat'),
 ('eurotown','UNA FIRMA IN SINCOPE',102,65,'major',[4,7,2,9,4,0,2,7],[0,1,4,5],'brush'),
 ('capitale','LA PORTA ACCANTO AL POTERE',90,57,'minor',[0,7,3,10,7,5,2,0],[0,5,3,4],'march'),
 ('campo_largo','DUE SEDIE TRE PROGRAMMI',106,60,'major',[7,4,9,2,4,0,7,5],[0,5,3,4],'beat'),
 ('social_tension','LA NOTIFICA NON ASPETTA',132,64,'minor',[0,2,7,3,2,10,7,2],[0,5,3,4],'pulse'),
 ('election_night','I SEGGI ANCORA ACCESI',82,57,'minor',[7,3,2,0,10,7,5,2],[0,3,5,4],'pulse'),
 ('interior','IL MODULO AL TAVOLO',88,65,'major',[9,7,4,2,7,0,4,2],[0,5,1,4],'brush'),
 ('palazzo','LA CONTROFIRMA RESPIRA',76,50,'minor',[0,3,7,2,10,5,3,2],[0,5,3,4],'march'),
 ('stretto','LA MOKA HA IL COLLAUDO',108,60,'minor',[7,3,10,7,2,5,3,0],[0,5,3,4],'bossa'),
 ('battle-wild','IL CANDIDATO NELL ERBA',124,62,'minor',[0,7,2,3,10,7,5,2],[0,3,5,4],'beat'),
 ('battle-trainer','IL MICROFONO PASSA',136,57,'minor',[7,0,3,2,10,5,7,2],[0,5,3,4],'beat'),
 ('battle-gym','LA REGIA NON TAGLIA',144,64,'minor',[0,3,7,10,7,2,5,3],[0,5,3,4],'pulse'),
 ('battle-boss','LA MAGGIORANZA OSCILLA',116,57,'minor',[0,1,7,3,10,5,2,0],[0,5,3,4],'march'),
 ('battle-legend','IL SIMBOLO RESTA',72,60,'minor',[7,10,3,2,7,5,0,3],[0,5,3,4],'brush'),
 ('offshore','LO SCONTRINO AL SOLE',94,65,'major',[4,9,7,2,0,4,7,9],[0,5,1,4],'bossa'),
 ('bruxelles','IL CORRIDOIO E UNA PARTITURA',100,62,'major',[9,4,7,2,4,0,5,7],[0,3,1,4],'march'),
 ('battle-duel','DUE LINEE IN DIRETTA',148,64,'minor',[7,2,0,10,3,7,5,2],[0,5,3,4],'pulse'),
]

def render(score, index):
    name,title,bpm,tonic,mode,motif,degrees,drums = score
    beat = 60/bpm
    length = round(32*beat*RATE)
    out = np.zeros((length,2),dtype=np.float64)
    rng = np.random.default_rng(731+index)
    scale = [0,2,4,5,7,9,11] if mode=='major' else [0,2,3,5,7,8,10]

    def add(sound, at, pan=0):
        offsets=(np.arange(len(sound))+round(at*RATE))%length
        for channel,gain in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):
            np.add.at(out[:,channel],offsets,sound*gain)

    def note(midi,at,dur,amp,voice='keys',pan=0):
        t=np.arange(round(dur*RATE))/RATE
        frequency=440*2**((midi-69)/12)
        signal=np.sin(2*np.pi*frequency*t)
        if voice=='keys':
            signal+=.3*np.sin(2*np.pi*frequency*2*t)*np.exp(-t*5)+.12*np.sin(2*np.pi*frequency*3*t)*np.exp(-t*8)
            env=(1-np.exp(-t*600))*np.exp(-t*4/dur)
        elif voice=='reed':
            signal+=.22*np.sin(2*np.pi*frequency*3*t)+.08*np.sin(2*np.pi*frequency*5*t)
            env=np.minimum(t/.025,1)*np.minimum((dur-t)/.08,1)
        elif voice=='pad':
            signal+=.2*np.sin(2*np.pi*(frequency*1.003)*t)
            env=np.minimum(t/.15,1)*np.minimum((dur-t)/.3,1)
        else:
            env=(1-np.exp(-t*180))*np.exp(-t*2/dur)
        add(signal*env*amp,at,pan)

    for bar in range(8):
        degree=degrees[bar%4]
        root=tonic+scale[degree]
        minor = mode=='minor' if degree==0 else degree in ([1,2,5] if mode=='major' else [0,1,3])
        # Warm three-note harmony, keys, round bass and a phrase that answers
        # the opening in the second four bars rather than repeating identically.
        for interval,pan in [(0,-.3),(3 if minor else 4,.25),(7,0)]:
            note(root+interval,bar*4*beat,4.15*beat,.034,'pad',pan)
        for step in range(8):
            at=(bar*4+step*.5)*beat
            offset=motif[(step+bar*2)%8]
            if bar>=4 and step in [2,6]: offset+=12
            if (step+bar)%4!=3:
                note(tonic+12+offset,at,beat*(.65 if drums in ['beat','pulse'] else 1.1),.08,
                     'reed' if drums=='march' else 'keys',-.22 if step%2 else .22)
            if step in [0,3,4,7]:
                note(root-12+(7 if step in [3,7] else 0),at,beat*.8,.115,'bass')
            if step in [1,5] and drums in ['brush','bossa']:
                for interval in [0,3 if minor else 4,7]:note(root+interval,at,beat*.6,.035,'keys',.3)
            if step in [0,4] or (drums=='pulse' and step%2==0):
                t=np.arange(round(.17*RATE))/RATE
                kick=np.sin(2*np.pi*(48*t+5*(1-np.exp(-t*30))))*np.exp(-t*24)
                add(kick*.16,at)
            if step in [2,6]:
                t=np.arange(round(.12*RATE))/RATE
                noise=rng.uniform(-1,1,len(t));noise=np.r_[noise[0],np.diff(noise)]
                add(noise*np.exp(-t*(48 if drums=='brush' else 28))*.045,at,.12)
            if drums!='march' or step%2:
                t=np.arange(round(.045*RATE))/RATE
                noise=rng.uniform(-1,1,len(t));noise=np.r_[noise[0],np.diff(noise)]
                add(noise*np.exp(-t*110)*.012,at,-.3)
    # Short stereo room, wrapped within the exact loop, retains note tails
    # across its boundary. Soft saturation and fixed headroom avoid clipping.
    dry=out.copy()
    for delay,amp in [(.071,.13),(.139,.08),(.211,.04)]:out+=np.roll(dry,round(delay*RATE),axis=0)[:,::-1]*amp
    out=np.tanh(out*1.4)
    out*=.78/max(.78,np.max(np.abs(out)))
    return out.astype(np.float32)

def main():
    masters=ROOT/'artifacts/audio';masters.mkdir(parents=True,exist_ok=True)
    target=ROOT/'public/audio';target.mkdir(parents=True,exist_ok=True)
    catalog={}
    for index,score in enumerate(SCORES):
        samples=render(score,index);name,title,bpm,*_=score
        source=masters/f'{name}.wav';dest=target/f'{name}.m4a'
        with wave.open(str(source),'wb') as wav:
            wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE)
            wav.writeframes((samples*32767).astype('<i2').tobytes())
        subprocess.run(['afconvert','-f','m4af','-d','aac','-b','96000','-q','127',str(source),str(dest)],check=True,capture_output=True)
        catalog[name]={'title':title,'file':f'audio/{name}.m4a','bpm':bpm,'seconds':len(samples)/RATE,'sampleRate':RATE,'frames':len(samples),
                       'peak':float(np.max(np.abs(samples))),'rms':float(np.sqrt(np.mean(samples**2))),
                       'waveSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size}
        print(name,dest.stat().st_size)
    (target/'catalog.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__':main()
