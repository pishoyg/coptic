#include "IbycusTxtFile.h"

__IBYCUS_BEGIN_NAMESPACE

IbycusTxtFile::IbycusTxtFile(const ibystring_t & id, const ibystring_t & vol) throw(IbycusFileException) :
                CurrentAuth_(0),
                CurrentWork_(0),
                CurrentSection_(0),
                CurrentBlockOffset_(0),
                State_(not_ready),
                Filename_("")
{
        Filename_ = id + ".TXT";
        Txt_.open((vol + "/" + Filename_).c_str(), ios::in | ios::binary);
        if (!Txt_.is_open())
                throw IbycusFileException("Couldn't open file " + vol
                        + "/" + id + ".TXT");

        // open .IDT file
        try {
                Idt_.Open(id, vol);
        } catch (IbycusFileException E) {
                State_ = not_ready;
                Txt_.close();
                throw E;
        }
}

IbycusTxtFile::~IbycusTxtFile()
{
        Txt_.close();
}

bool IbycusTxtFile::Top(const int auth, const int work, const int sect) throw(IbycusException)
{
        State_ = not_ready;
        if (auth < Idt_.Count()) {
                if (work < Idt_.Count(auth)) {
                        if (sect < Idt_.Count(auth, work)) {
                                CurrentAuth_    = auth;
                                CurrentWork_    = work;
                                CurrentSection_ = sect;

                                CurrentEos_ = Idt_.End(CurrentAuth_, CurrentWork_, CurrentSection_);
                                CurrentEow_ = Idt_.End(CurrentAuth_, CurrentWork_);
                                CurrentEoa_ = Idt_.End(CurrentAuth_);

                                CurrentLine_.Clear();
                                Next();
                                State_ = ready;
                                return true;
                        } else {
                                 throw IbycusException("Section out of range", Idt_.tellg());
                        }
                } else {
                        throw IbycusException("Work out of range", Idt_.tellg());
                }
        } else {
                throw IbycusException("Author out of range", Idt_.tellg());
        }

        return false;
}

bool IbycusTxtFile::Start(const int auth, const int work, const int sect)
        throw(IbycusException)
{
        Goto(IbycusId(Idt_.Start(auth, work, sect)));
        return true;
}


bool IbycusTxtFile::Next() throw(IbycusException, IbycusParseException)
{
        try {
                if (State_ == beginning_of_section) {
                        CurrentLine_.Clear();
                        get_first_line();
                        State_ = ready;
                } else if (State_ == ready) {
                        CurrentLine_.Read(Txt_);
                        //Txt_ >> CurrentLine_
                } else {
                        return false;
                }
        } catch(IbycusParseException E) {
                State_ = not_ready;
                throw E;
        }

        switch (CurrentLine_.Id().Flag()) {
        case IbycusId::NOFLAG:
        //	if (currentLine.m_id == currentEndId)
        //		state = end_of_section;
                return true;
        case IbycusId::ENDOFBLOCK:
                goto_block(CurrentBlockOffset_ + 1);
                return Next();
        case IbycusId::ENDOFFILE:
                State_ = not_ready;
                return false;
        case IbycusId::EXCEPTION_START:
                return true;
        case IbycusId::EXCEPTION_END:
                return true;
        default:
                throw IbycusParseException("Error reading file " + Filename_, Txt_.tellg());
        }

        State_ = not_ready;
        return false;

}

void IbycusTxtFile::Goto(const IbycusId & target) throw(IbycusNoId)
{
        State_ = not_ready;
        int work, sect, section_count;
        bool found_a_section = false;
        int work_count = Idt_.Count(0);

        for (work = 0; work < work_count; work++) {
                if (target.SameAs(Idt_.Start(0, work), IbycusId::cl_work)) {
                        section_count = Idt_.Count(0, work);
                        for (sect = 0; sect < section_count; sect++) {
                                if (target.SameAs(Idt_.Start(0, work, sect), IbycusId::cl_sect)) {
                                        goto_block(Idt_.Block(0, work, sect, target));
                                        found_a_section = true;

                                        while (Id() != target && Id().Flag() != IbycusId::ENDOFBLOCK) {
                                                Next();
                                        }

                                        CurrentAuth_ = 0;
                                        CurrentWork_ = work;
                                        CurrentSection_ = sect;
                                        CurrentStartId_ = Idt_.Start(CurrentAuth_, CurrentWork_, CurrentSection_);
                                        CurrentEos_ = Idt_.End(CurrentAuth_, CurrentWork_, CurrentSection_);
                                        CurrentEow_ = Idt_.End(CurrentAuth_, CurrentWork_);
                                        CurrentEoa_ = Idt_.End(CurrentAuth_);

                                        // Exit loop
                                        work = work_count + 1;
                                        sect = section_count + 1;

                                }
                        }
                } else {
                        cout << target << " is not in " << Idt_.Start(0, work) << "\n";
                }
        }
        State_ = ready;
        if (Id().Flag() == IbycusId::ENDOFBLOCK || !found_a_section) {
                throw(IbycusNoId(target.ToString() + " Not Found"));
        }

}

ibystring_t IbycusTxtFile::StripCodes() const throw()
{
        ibystring_t nocodes = CurrentLine_.Text();
        unsigned int pos = nocodes.npos;
        while ((pos = nocodes.find_first_of("\\/=|*0123456789$&%\"@[]<>{}#().,;:")) != nocodes.npos) {
                nocodes.erase(pos, 1);
        }
        return nocodes;
}

const IbycusId & IbycusTxtFile::StartId(int auth, int work, int section)
{
        return Idt_.Start(auth, work, section);
}

const IbycusId & IbycusTxtFile::EndId(int auth, int work, int section)
{
        return Idt_.End(auth, work, section);
}


bool IbycusTxtFile::goto_block(ibylen_t block)
{
        // Goto beginning of a new block
        try {
                Txt_.seekg(block * block_size);
                CurrentBlockOffset_ = block;
                State_ = ready;
                return true;
        } catch (...) {
                State_ = not_ready;
                throw;
        }
}

void IbycusTxtFile::get_first_line() throw(IbycusException, IbycusParseException)
{
        CurrentStartId_ = Idt_.Start(CurrentAuth_, CurrentWork_, CurrentSection_);
        CurrentEos_ = Idt_.End(CurrentAuth_, CurrentWork_, CurrentSection_);
        CurrentEow_ = Idt_.End(CurrentAuth_, CurrentWork_);
        CurrentEoa_ = Idt_.End(CurrentAuth_);

        goto_block(Idt_.Block(CurrentAuth_, CurrentWork_, CurrentSection_));

        IbycusId::comp_level cl;
        if (CurrentSection_ == 0)
                 cl = IbycusId::cl_work;
        else
                cl = IbycusId::cl_sect;

        bool keepon = true;
        while (keepon) {
                try {
                        //Txt_ >> CurrentLine_;
                        CurrentLine_.Read(Txt_);

                        switch (CurrentLine_.Id().Flag()) {
                        case IbycusId::NOFLAG:
                                if (CurrentLine_.Id().SameAs(CurrentStartId_, cl))
                                        keepon = false;
                                break;
                        case IbycusId::ENDOFBLOCK:
                                State_ = not_ready;
                                throw IbycusException("Reached end of file before " + CurrentStartId_.ToString(), Txt_.tellg());
                        case IbycusId::ENDOFFILE:
                                State_ = not_ready;
                                throw IbycusException("Reached end of file before " + CurrentStartId_.ToString(), Txt_.tellg());
                        }
                } catch(IbycusParseException E) {
                        State_ = not_ready;
                        throw E;
                }
        }
}

__IBYCUS_END_NAMESPACE
