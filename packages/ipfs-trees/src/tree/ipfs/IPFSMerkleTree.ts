import { CID } from 'multiformats';
import IPFSMerkle from './IPFSMerkle';
import IPFSMerkleIndex from './IPFSMerkleIndex';
import IPFSTreeMap from './IPFSTreeMap';

export default class IPFSMerkleTree extends IPFSMerkle {
    private readonly _parentMapping: IPFSTreeMap | undefined;

    protected constructor(
        key: IPFSMerkleIndex | undefined,
        left: IPFSMerkleTree | undefined,
        right: IPFSMerkleTree | undefined,
        keyCID: CID | undefined,
        leftCID: CID | undefined,
        rightCID: CID | undefined,
        parentMapping?: IPFSTreeMap | undefined,
    ) {
        super(key, left, right, keyCID, rightCID, leftCID);
        if (!key) throw new Error('No key!');
        this._parentMapping = parentMapping;
    }

    static async createLeafAsync(key: IPFSMerkleIndex): Promise<IPFSMerkle> {
        const n = this.create(key, undefined, undefined);
        const cid = await n.cid();
        //@ts-ignore
        n._parentMapping = IPFSTreeMap.createMap(key.toHex(), cid);
        return n;
    }

    //Inserts and returns root
    static async *insertGenerator(root: IPFSMerkleTree | undefined, a: IPFSMerkleTree): AsyncGenerator<IPFSMerkleTree> {
        if (!root) {
            //No root, return self
            yield a;
            return;
        }

        const levelOrderGen = IPFSMerkleTree.levelOrderTraversal(root);

        for await (const n of levelOrderGen) {
            const left = await n.getLeft();
            if (left === undefined) {
                //Set Left Node
                yield (await n.withLeft(a)) as IPFSMerkleTree;
                break;
            } else {
                const right = await n.getRight();
                if (right === undefined) {
                    //Set Right Node
                    yield (await n.withRight(a)) as IPFSMerkleTree;
                    break;
                }
            }
        }
    }

    static async insert(root: IPFSMerkleTree | undefined, a: IPFSMerkleTree): Promise<IPFSMerkleTree> {
        const gen = IPFSMerkleTree.insertGenerator(root, a);
        let n: IPFSMerkleTree;
        for await (n of gen) {
            n = n;
        }
        return n!;
    }

    async *insertGenerator(a: IPFSMerkleTree): AsyncGenerator<IPFSMerkleTree> {
        yield* IPFSMerkleTree.insertGenerator(this, a);
    }

    async insert(a: IPFSMerkleTree): Promise<IPFSMerkleTree> {
        return IPFSMerkleTree.insert(this, a);
    }
}
