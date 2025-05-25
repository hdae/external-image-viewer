import toast from "react-hot-toast"

export const copyToClipboard = (text: string) => {
    toast.promise(navigator.clipboard.writeText(text), {
        loading: "Copying",
        error: "Copy failed",
        success: "Copied"
    })
}
