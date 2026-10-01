"use client"

import Image from "next/image"
import { HeartIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

/** Header button that opens the donation QR code. */
export function DonateButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Donate">
          <HeartIcon className="text-pink-500" />
          <span className="hidden sm:inline">Donate</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Support tablecn</DialogTitle>
          <DialogDescription>
            tablecn is free and open source. If it saves you time, you can
            support it by scanning this QR code with a Vietnamese banking or
            e-wallet app. Thank you!
          </DialogDescription>
        </DialogHeader>
        <Image
          src="/donate-qr.jpg"
          alt="Donation QR code for Tran Minh Duoc"
          width={470}
          height={640}
          className="mx-auto w-full max-w-64 rounded-lg"
        />
      </DialogContent>
    </Dialog>
  )
}
