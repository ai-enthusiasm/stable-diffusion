from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from diffusers import DiffusionPipeline
import torch
from translate import Translator
from PIL import Image
import io

app = FastAPI()


def translate_to_english(text: str) -> str:
    """Dịch văn bản từ tiếng Việt sang tiếng Anh."""
    translator = Translator(to_lang="en", from_lang="vi")
    try:
        translation = translator.translate(text)
        return translation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi dịch văn bản: {e}")


sd_model_name = "stabilityai/stable-diffusion-xl-base-1.0"
pipe = DiffusionPipeline.from_pretrained(
    sd_model_name,
    torch_dtype=torch.float16,
    use_safetensors=True,
    variant="fp16"
)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
pipe.to(device)


@app.post("/text-to-image/")
async def text_to_image(
    input: str = Form(...),
    width: int = 1024,
    height: int = 1024,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.5
    ):

    """Tạo hình ảnh từ văn bản với các tham số tùy chỉnh."""
    translated_text = translate_to_english(input)
    result = pipe(
                prompt=translated_text,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
                ).images[0]
    image_path = "output_image.png"
    result.save(image_path)
    return {"translated_text": translated_text, "image_path": image_path}

@app.post("/image-to-image/")
async def image_to_image(
    input: str = Form(...), 
    width: int = 1024,
    height: int = 1024,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.5,
    file: UploadFile = File(...)
    ):

    """Chuyển đổi hình ảnh thành hình ảnh dựa trên văn bản."""
    translated_text = translate_to_english(input)
    init_image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    result = pipe(
                prompt=translated_text, 
                image=init_image,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
                ).images[0]
    image_path = "output_image.png"
    result.save(image_path)
    return {"translated_text": translated_text, "image_path": image_path}

@app.post("/inpainting/")
async def inpainting(
    input: str = Form(...),
    width: int = 1024,
    height: int = 1024,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.5, 
    file: UploadFile = File(...), 
    mask: UploadFile = File(...)
    ):

    """Chỉnh sửa vùng được chỉ định trên hình ảnh."""
    translated_text = translate_to_english(input)
    init_image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    mask_image = Image.open(io.BytesIO(await mask.read())).convert("RGB")
    result = pipe(
                prompt=translated_text, 
                image=init_image, 
                mask_image=mask_image,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
                ).images[0]
    image_path = "output_image.png"
    result.save(image_path)
    return {"translated_text": translated_text, "image_path": image_path}


