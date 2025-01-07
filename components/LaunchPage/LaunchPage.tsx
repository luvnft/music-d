import Button from "../Button";
import Image from "next/image";

const LaunchPage = (props: any) => {
  const { onClick } = props;

  return (
    <div
      style={{ backgroundImage: "url('/images/bg.png')" }}
      className="flex flex-col bg-right-bottom bg-cover"
    >
      <Image className="object-contain object-right-bottom pl-16" src="/images/landing-bg1.png" fill alt="bg" />
      <div className="relative grid min-h-screen grid-cols-1 md:grid-cols-2">
        <div className="flex items-center justify-center">
          <div className="space-y-4">
            <h3>LUV NFT/h3>
            <h1 className="pb-4">
              Vibes<br></br> Player
            </h1>
            <Button text="Create yours" onClick={onClick} />
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <iframe
            className="w-[350px] h-[350px] rounded-lg z-10"
            src="https://tontv.mypinata.cloud/ipfs/bafybeib4y7cv7qwtpxub77zpogpgjc6k6bu3vax2t34hjkvspgpdkta4ja?playlist-url=https://nftstorage.link/ipfs/bafkreieklxj3vzyv3bac7zyxqvq32altzw55hz5bktl7cydfojxxyikbc4"
          />
        </div>
      </div>
    </div>
  );
};

export default LaunchPage;
