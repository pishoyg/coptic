#include "IbycusIdt.h"

__IBYCUS_BEGIN_NAMESPACE

IbycusIdtFile::IbycusIdtFile(const ibystring_t & id, const ibystring_t & vol)
 : CurrentAuthIndex_(-1)
{
        Open(id, vol);
}

// TODO: Throw an error if the file cannot be opened

IbycusIdtFile::~IbycusIdtFile()
{
        Idt_.close();
}

void IbycusIdtFile::Open(const ibystring_t & id, const ibystring_t & vol)
{
        ibystring_t fname = vol + "/" + id + ".IDT";
        Idt_.open(fname.c_str());
        if (!Idt_.is_open())
                throw IbycusFileException("Couldn't open file: " + fname);
}

int IbycusIdtFile::Count(const int auth, const int work)
{
        if (auth > -1) { // count the works in an author
                _get(auth);
                return CurrentAuth_.Count(Idt_, work);
        } else {		 // count the authors in the .idt file
                ibyIdtAuth temp;
                Idt_.clear();
                Idt_.seekg(0);
                int count = 0;
                while (!Idt_.eof()) {
                        Idt_ >> temp;
                        count++;
                }
                return --count;
        }

        return -1; // failure
}

ibylen_t IbycusIdtFile::Block(const int auth, const int work,
                                           const int sect, const IbycusId & id)
                                           throw(IbycusNoId)
{
        _get(auth,work);
        return CurrentAuth_.Block(Idt_, work, sect, id);
}

int IbycusIdtFile::CiteLevels(int auth, int work)
{
        _get(auth, work);
        return CurrentAuth_.CiteLevels(Idt_, work);
}

const ibystring_t & IbycusIdtFile::Name(const int auth, const int work)
{
        _get(auth,work);
        return CurrentAuth_.Name(work);
}

const IbycusId & IbycusIdtFile::Id(const int auth, const int work, const int sect)
{
        _get(auth,work);
        return CurrentAuth_.Id(work,sect);
}

const IbycusId & IbycusIdtFile::Start(const int auth, const int work, const int sect)
{
        _get(auth,work,sect);
        return CurrentAuth_.Start(Idt_, work, sect);
}

const IbycusId & IbycusIdtFile::End(const int auth, const int work, const int sect)
{
        _get(auth,work);
        return CurrentAuth_.End(Idt_, work, sect);
}

int IbycusIdtFile::Span(const int auth, const int work, const int sect)
{
        _get(auth,work);
        return CurrentAuth_.Span(Idt_, work,sect);
}

int IbycusIdtFile::tellg()
{
        return Idt_.tellg();
}

void IbycusIdtFile::_get(const int auth, const int work, const int sect)
{
        if (auth != CurrentAuthIndex_) {
                int i;
                Idt_.clear();
                Idt_.seekg(0);
                for (i = 0; i <= auth; i++)
                        Idt_ >> CurrentAuth_;

                CurrentAuth_.Read(Idt_);
                CurrentAuthIndex_ = auth;
        }

        if (work > -1)
                CurrentAuth_.Get(Idt_, work, sect);
}

__IBYCUS_END_NAMESPACE
